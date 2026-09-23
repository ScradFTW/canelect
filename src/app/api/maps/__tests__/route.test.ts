import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';

const query = vi.fn();
vi.mock('@/lib/db', () => ({
    ensureSchema: vi.fn(async () => undefined),
    getPool: () => ({query}),
}));

const createMap = vi.fn();
vi.mock('@/lib/maps', async (importOriginal) => ({
    ...await importOriginal<typeof import('@/lib/maps')>(),
    createMap: (...args: unknown[]) => createMap(...args),
}));

const {GET, POST} = await import('../route');

// Every POST gets its own client IP so the per-IP save limit doesn't leak between tests
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;

function post(body: string, headers: Record<string, string> = {}) {
    return POST(new NextRequest('http://localhost/api/maps', {
        method: 'POST',
        body,
        headers: {'content-type': 'application/json', 'x-forwarded-for': nextIp(), ...headers},
    }));
}

beforeEach(() => {
    query.mockReset();
    createMap.mockReset();
});

describe('GET /api/maps', () => {
    beforeEach(() => {
        query.mockImplementation(async (sql: string) =>
            sql.includes('COUNT(*) AS count') ? {rows: [{count: '0'}]} : {rows: []});
    });

    // The list query is the one that takes LIMIT/OFFSET parameters
    const listCall = () => query.mock.calls.find(([, params]) => Array.isArray(params))!;

    async function list(search: string) {
        const res = await GET(new NextRequest(`http://localhost/api/maps?${search}`));
        expect(res.status).toBe(200);
        return {sql: listCall()[0] as string, params: listCall()[1] as number[], body: await res.json()};
    }

    it('defaults to newest first, 100 per page', async () => {
        const {sql, params} = await list('');
        expect(sql).toContain('ORDER BY created_at DESC');
        expect(params).toEqual([100, 0]);
    });

    it.each([
        ['name', 'ORDER BY name ASC'],
        ['created_at', 'ORDER BY created_at ASC'],
        ['liberal', "value = 'Liberal') ASC"],
        ['bloc', "value = 'Bloc Quebecois') ASC"],
    ])('sorts by allowlisted key %s', async (sortKey, expected) => {
        const {sql} = await list(`sortKey=${sortKey}&sortAsc=true`);
        expect(sql).toContain(expected);
    });

    it.each(['constructor', '__proto__', 'toString', 'name; DROP TABLE maps', 'updated_at'])(
        'ignores non-allowlisted sort key %j',
        async (sortKey) => {
            const {sql} = await list(`sortKey=${encodeURIComponent(sortKey)}`);
            expect(sql).toContain('ORDER BY created_at DESC');
            expect(sql).not.toContain('DROP');
        },
    );

    it('clamps page size and out-of-range pages', async () => {
        const {params, body} = await list('limit=5000&page=99999999999999999999');
        expect(params).toEqual([100, 0]);
        expect(body).toMatchObject({page: 1, limit: 100});
    });

    it('computes the offset from page and limit', async () => {
        const {params} = await list('limit=12&page=3');
        expect(params).toEqual([12, 24]);
    });

    it('adds the filters when asked', async () => {
        const {sql} = await list('hideIncomplete=true&hideSingleParty=true');
        expect(sql).toContain('>= 343');
        expect(sql).toContain('HAVING COUNT(*) > 274');
    });

    it('returns 500 without leaking details when the database fails', async () => {
        query.mockRejectedValue(new Error('connection refused at 10.0.0.5'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await GET(new NextRequest('http://localhost/api/maps'));

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({error: 'Internal Server Error'});
    });
});

describe('POST /api/maps', () => {
    it('saves a valid map and returns its name', async () => {
        createMap.mockResolvedValue('polite-moose');

        const res = await post(JSON.stringify({ridings: {'10001': 'Liberal', '10002': null}}));

        expect(res.status).toBe(201);
        expect(await res.json()).toEqual({name: 'polite-moose'});
        expect(createMap).toHaveBeenCalledWith({'10001': 'Liberal'});
    });

    it.each([
        ['malformed JSON', 'not json'],
        ['missing ridings', JSON.stringify({})],
        ['an unknown riding', JSON.stringify({ridings: {'99999': 'Liberal'}})],
        ['an unknown party', JSON.stringify({ridings: {'10001': 'Rhinoceros'}})],
    ])('rejects %s with 400', async (_label, body) => {
        const res = await post(body);
        expect(res.status).toBe(400);
        expect(createMap).not.toHaveBeenCalled();
    });

    it('rejects a map with no ridings assigned', async () => {
        const res = await post(JSON.stringify({ridings: {'10001': null}}));
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({error: 'Give at least one riding a party before saving.'});
    });

    it('rejects a body over 64 KB even without a Content-Length header', async () => {
        const huge = JSON.stringify({ridings: {'10001': 'Liberal'}, pad: 'a'.repeat(70 * 1024)});

        const res = await post(huge);

        expect(res.status).toBe(400);
        expect(createMap).not.toHaveBeenCalled();
    });

    it('rejects a body whose declared Content-Length is over 64 KB', async () => {
        const res = await post(JSON.stringify({ridings: {'10001': 'Liberal'}}), {'content-length': String(65 * 1024)});
        expect(res.status).toBe(400);
    });

    it('limits each client IP to 10 saves', async () => {
        createMap.mockResolvedValue('polite-moose');
        const ip = nextIp();
        const body = JSON.stringify({ridings: {'10001': 'Liberal'}});

        const statuses = [];
        for (let i = 0; i < 11; i++) {
            statuses.push((await post(body, {'x-forwarded-for': ip})).status);
        }

        expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201));
        expect(statuses[10]).toBe(429);
        // A different client is unaffected
        expect((await post(body)).status).toBe(201);
    });

    it('asks the user to try again when the site-wide save limit is hit', async () => {
        const {SaveRateLimitedError} = await import('@/lib/maps');
        createMap.mockRejectedValue(new SaveRateLimitedError());

        const res = await post(JSON.stringify({ridings: {'10001': 'Liberal'}}));

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBe('1');
        expect((await res.json()).error).toMatch(/try again/i);
    });

    it('returns 500 when saving fails', async () => {
        createMap.mockRejectedValue(new Error('db down'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const res = await post(JSON.stringify({ridings: {'10001': 'Liberal'}}));

        expect(res.status).toBe(500);
        expect(await res.json()).toEqual({error: 'Internal Server Error'});
    });
});
