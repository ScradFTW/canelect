import {beforeEach, describe, expect, it, vi} from 'vitest';

const query = vi.fn();
// createMap runs on a checked-out client (for its transaction)
const clientQuery = vi.fn();
const release = vi.fn();
vi.mock('../db', () => ({
    ensureSchema: vi.fn(async () => undefined),
    getPool: () => ({query, connect: async () => ({query: clientQuery, release})}),
}));

const {createMap, getMap, parseRidings, sanitizeRidings, SaveRateLimitedError} = await import('../maps');
const {Party} = await import('@/components/CanadaMap/types/types');

beforeEach(() => {
    query.mockReset();
    clientQuery.mockReset();
    release.mockReset();
});

describe('parseRidings', () => {
    it('accepts known riding IDs mapped to known parties', () => {
        expect(parseRidings({'10001': 'Liberal', '62001': 'Bloc Quebecois'}))
            .toEqual({'10001': 'Liberal', '62001': 'Bloc Quebecois'});
    });

    it('drops undecided (null) ridings', () => {
        expect(parseRidings({'10001': 'NDP', '10002': null})).toEqual({'10001': 'NDP'});
    });

    it('accepts an empty map (the API rejects it separately)', () => {
        expect(parseRidings({})).toEqual({});
    });

    it.each([
        ['an unknown riding ID', {'99999': 'Liberal'}],
        ['an unknown party', {'10001': 'Rhinoceros'}],
        ['a non-string party', {'10001': 7}],
        ['markup in place of a party', {'10001': '<img src=x onerror=alert(1)>'}],
    ])('rejects the whole map for %s', (_label, input) => {
        expect(parseRidings(input)).toBeNull();
    });

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['an array', ['Liberal']],
        ['a string', 'Liberal'],
    ])('rejects %s', (_label, input) => {
        expect(parseRidings(input)).toBeNull();
    });

    it('rejects prototype keys smuggled in through JSON', () => {
        expect(parseRidings(JSON.parse('{"__proto__": "Liberal"}'))).toBeNull();
    });
});

describe('sanitizeRidings', () => {
    it('keeps valid entries and silently drops the rest', () => {
        expect(sanitizeRidings({
            '10001': 'Liberal',
            '10002': '<script>alert(1)</script>',
            '99999': 'NDP',
            '35001': null,
        })).toEqual({'10001': 'Liberal'});
    });

    it('returns an empty map for anything that is not an object', () => {
        expect(sanitizeRidings(null)).toEqual({});
        expect(sanitizeRidings(['Liberal'])).toEqual({});
        expect(sanitizeRidings('Liberal')).toEqual({});
    });
});

describe('createMap', () => {
    // Scripts clientQuery by SQL: whether the throttle claim succeeds, and the
    // rowCount each INSERT attempt returns in turn
    function scriptDb({claimed = true, inserts = [1]}: { claimed?: boolean; inserts?: number[] } = {}) {
        const insertResults = [...inserts];
        clientQuery.mockImplementation(async (sql: string) => {
            if (sql.includes('SET last_saved_at = clock_timestamp()') && sql.includes('WHERE id = 1\n')) {
                return {rowCount: claimed ? 1 : 0};
            }
            if (sql.startsWith('INSERT INTO maps')) {
                return {rowCount: insertResults.shift() ?? 0};
            }
            return {rowCount: 1};
        });
    }
    const statements = () => clientQuery.mock.calls.map(([sql]) => (sql as string).trim().split(/\s+/).slice(0, 2).join(' '));

    it('claims the save slot, stores the map and commits', async () => {
        scriptDb();

        const name = await createMap({'10001': Party.Liberal});

        expect(name).toMatch(/^\S+-\S+$/);
        expect(statements()).toEqual(['BEGIN', 'UPDATE save_throttle', 'INSERT INTO', 'UPDATE save_throttle', 'COMMIT']);
        const insert = clientQuery.mock.calls.find(([sql]) => (sql as string).startsWith('INSERT INTO maps'))!;
        expect(insert[1]).toEqual([name, JSON.stringify({'10001': 'Liberal'})]);
        expect(release).toHaveBeenCalledOnce();
    });

    it('requires at least one second since the last save', async () => {
        scriptDb();

        await createMap({'10001': Party.Liberal});

        const claim = clientQuery.mock.calls.find(([sql]) => (sql as string).includes('make_interval'))!;
        expect(claim[1]).toEqual([1]);
    });

    it('refuses to save when another map was saved within the last second', async () => {
        scriptDb({claimed: false});

        await expect(createMap({'10001': Party.Liberal})).rejects.toBeInstanceOf(SaveRateLimitedError);

        expect(statements()).toEqual(['BEGIN', 'UPDATE save_throttle', 'ROLLBACK']);
        expect(release).toHaveBeenCalledOnce();
    });

    it('tries another name when one is already taken', async () => {
        scriptDb({inserts: [0, 1]});

        await createMap({'10001': Party.Liberal});

        expect(statements().filter(s => s === 'INSERT INTO')).toHaveLength(2);
        expect(statements().at(-1)).toBe('COMMIT');
    });

    it('rolls back and gives up after 50 name collisions', async () => {
        scriptDb({inserts: []});

        await expect(createMap({'10001': Party.Liberal})).rejects.toThrow('Failed to generate unique map name');

        expect(statements().filter(s => s === 'INSERT INTO')).toHaveLength(50);
        expect(statements().at(-1)).toBe('ROLLBACK');
        expect(release).toHaveBeenCalledOnce();
    });

    it('rolls back and releases the connection when the database fails', async () => {
        clientQuery.mockImplementation(async (sql: string) => {
            if (sql.startsWith('INSERT INTO maps')) throw new Error('disk full');
            return {rowCount: 1};
        });

        await expect(createMap({'10001': Party.Liberal})).rejects.toThrow('disk full');

        expect(statements().at(-1)).toBe('ROLLBACK');
        expect(release).toHaveBeenCalledOnce();
    });
});

describe('getMap', () => {
    it('returns null when no map has that name', async () => {
        query.mockResolvedValueOnce({rowCount: 0, rows: []});

        expect(await getMap('no-such-map')).toBeNull();
    });

    it('sanitizes stored ridings before returning them', async () => {
        query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{
                name: 'polite-moose',
                ridings: {'10001': 'Liberal', '62001': '<img src=x onerror=alert(1)>'},
                created_at: new Date('2025-04-20T00:00:00Z'),
            }],
        });

        expect(await getMap('polite-moose')).toEqual({
            name: 'polite-moose',
            ridings: {'10001': 'Liberal'},
            createdAt: '2025-04-20T00:00:00.000Z',
        });
    });
});
