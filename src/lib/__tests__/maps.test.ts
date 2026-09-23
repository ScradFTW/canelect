import {beforeEach, describe, expect, it, vi} from 'vitest';

const query = vi.fn();
vi.mock('../db', () => ({
    ensureSchema: vi.fn(async () => undefined),
    getPool: () => ({query}),
}));

const {createMap, getMap, parseRidings, sanitizeRidings} = await import('../maps');
const {Party} = await import('@/components/CanadaMap/types/types');

beforeEach(() => {
    query.mockReset();
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
    it('stores the map under a generated name', async () => {
        query.mockResolvedValueOnce({rowCount: 1});

        const name = await createMap({'10001': Party.Liberal});

        expect(name).toMatch(/^\S+-\S+$/);
        const [sql, params] = query.mock.calls[0];
        expect(sql).toContain('INSERT INTO maps');
        expect(params).toEqual([name, JSON.stringify({'10001': 'Liberal'})]);
    });

    it('tries another name when one is already taken', async () => {
        query.mockResolvedValueOnce({rowCount: 0}).mockResolvedValueOnce({rowCount: 1});

        await createMap({'10001': Party.Liberal});

        expect(query).toHaveBeenCalledTimes(2);
    });

    it('gives up after 50 collisions', async () => {
        query.mockResolvedValue({rowCount: 0});

        await expect(createMap({'10001': Party.Liberal})).rejects.toThrow('Failed to generate unique map name');
        expect(query).toHaveBeenCalledTimes(50);
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
