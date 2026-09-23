import 'server-only';
import {randomInt} from 'crypto';
import GEOID_TO_PROVINCE from '@/data/geoid_to_province.json';
import {Party, PartyRidings} from '@/components/CanadaMap/types/types';
import {ensureSchema, getPool} from './db';

const RIDING_IDS = new Set(Object.keys(GEOID_TO_PROVINCE));
const PARTIES = new Set<string>(Object.values(Party));

/**
 * Keeps only entries with a known riding ID and party. Used on read, since
 * maps migrated from the old sign-in version were never validated.
 */
export function sanitizeRidings(input: unknown): PartyRidings {
    const ridings: PartyRidings = {};
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return ridings;
    for (const [id, party] of Object.entries(input)) {
        if (RIDING_IDS.has(id) && typeof party === 'string' && PARTIES.has(party)) {
            ridings[id] = party as Party;
        }
    }
    return ridings;
}

/**
 * Checks a client-submitted map: only known riding IDs, only known parties.
 * Returns the cleaned map with undecided ridings dropped, or null if invalid.
 */
export function parseRidings(input: unknown): PartyRidings | null {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;

    const ridings: PartyRidings = {};
    for (const [id, party] of Object.entries(input)) {
        if (!RIDING_IDS.has(id)) return null;
        if (party === null) continue;
        if (typeof party !== 'string' || !PARTIES.has(party)) return null;
        ridings[id] = party as Party;
    }
    return ridings;
}

// ——————————————————————————————————————————
// 🍁  Canada‑themed Silly‑name generator (random & unique)
// ——————————————————————————————————————————
const ADJECTIVES = [
    'polite', 'maple', 'loonie', 'chilly', 'rocky', 'prairie', 'lumberjack', 'red', 'northern', 'snowy',
    'friendly', 'bilingual', 'true', 'eh', 'hoser', 'poutine', 'timbit', 'mountie', 'canuck', 'arctic',
    'glacial', 'aurora', 'cozy', 'curling', 'leafy', 'mighty', 'icebound', 'blizzardy', 'frosty', 'cedary',
    'syrupy', 'tundra', 'igloo', 'great', 'neighbourly', 'acadian', 'maritime', 'algonquin', 'sixtybelow',
    'snow‑capped', 'greatwhite', 'loyalist', 'mapletastic', 'timhortonian', 'oakan', 'sugary', 'piney', 'glacier‑borne', 'iglooid',
    'capitol', 'saskatchewanian', 'manitoulin', 'united', 'confed', 'harbourfront', 'northern‑lights', 'boreal', 'cabiny', 'riverine',
    'lakelands', 'frontier', 'chestnut', 'glen', 'senatorial', 'redserge', 'tuktuk', 'klondike', 'ice‑road', 'seasonal',
    'thunderous', 'craft‑beer', 'friendly‑giant', 'heritage', 'true‑north', 'stalwart', 'laconic', 'polaris', 'muskeggy',
    'trailside', 'rugged', 'majestic', 'hinterland', 'urban‑igloo', 'maple‑leafed', 'double‑double', 'zamboni‑esque', 'beachy', 'cottage‑country',
];
const NOUNS = [
    'moose', 'beaver', 'goose', 'poutine', 'mountie', 'loonie', 'toonie', 'maple', 'timbit', 'snowshoe',
    'canoe', 'hockey‑puck', 'caesar', 'caribou', 'bison', 'polar‑bear', 'sled', 'lacrosse', 'tuque', 'skidoo',
    'loon', 'prairie‑dog', 'rockies', 'aurora', 'tundra', 'cedar', 'backbacon', 'buttertart', 'beavertail', 'chinook',
    'saskatoon‑berry', 'ogopogo', 'capilano', 'bluenose', 'confederation', 'kayak', 'igloo', 'muskoka', 'riding', 'fiddlehead',
    'timbits', 'syrup‑jug', 'snowbank', 'zamboni', 'hoserdom', 'curling‑stone', 'igloo‑block', 'lumberjack‑shirt', 'borealis', 'kayak‑paddle',
    'portage', 'voyageur', 'muktuk', 'potlatch', 'carp', 'coyote', 'loon‑call', 'maple‑leaf', 'gravy', 'saskatoon‑pie',
    'trillium', 'aurora‑borealis', 'tri‑color', 'blue‑jay', 'grizzly', 'maple‑cookie', 'blackfly', 'beach', 'lakelouise', 'stanley‑cup',
    'timberwolf', 'whitecap', 'smokestack', 'canola', 'grain‑elevator', 'inukshuk', 'trapper‑hat', 'campfire', 'muskeg', 'bushplane',
    'ice‑road', 'cedar‑strip', 'logjam', 'salmon', 'ridge', 'peak', 'fjord', 'bay', 'strait', 'prairie‑sky',
];

const randomElement = <T, >(arr: T[]): T => arr[randomInt(arr.length)];
const makeRandomSillyName = () => `${randomElement(ADJECTIVES)}-${randomElement(NOUNS)}`;

export type SavedMap = {
    name: string;
    ridings: PartyRidings;
    createdAt: string;
};

/** Site-wide minimum gap between saved maps, across every server instance. */
export const MIN_SAVE_INTERVAL_MS = 1000;

/** Thrown by createMap when another map was saved less than MIN_SAVE_INTERVAL_MS ago. */
export class SaveRateLimitedError extends Error {
    constructor() {
        super('Another map was saved less than a second ago');
        this.name = 'SaveRateLimitedError';
    }
}

/**
 * Stores a new map under a fresh random name and returns that name.
 *
 * Saves are limited site-wide to one per MIN_SAVE_INTERVAL_MS, enforced in
 * Postgres so it holds across every Cloud Run instance. Each save claims the
 * single save_throttle row inside its transaction: the row lock makes
 * concurrent saves queue, and a save only proceeds if the last one was at
 * least the interval ago. The timestamp is refreshed right before commit, so
 * committed saves are always at least that far apart, however long the
 * insert takes. Throws SaveRateLimitedError when the claim fails.
 */
export async function createMap(ridings: PartyRidings): Promise<string> {
    await ensureSchema();
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');

        const claim = await client.query(
            `UPDATE save_throttle
             SET last_saved_at = clock_timestamp()
             WHERE id = 1
               AND last_saved_at <= clock_timestamp() - make_interval(secs => $1)`,
            [MIN_SAVE_INTERVAL_MS / 1000]
        );
        if (!claim.rowCount) {
            await client.query('ROLLBACK');
            throw new SaveRateLimitedError();
        }

        // Retry on name collisions; after enough tries, add a number suffix
        for (let attempt = 0; attempt < 50; attempt++) {
            const base = makeRandomSillyName();
            const name = attempt < 25 ? base : `${base}-${randomInt(10, 1000)}`;
            const res = await client.query(
                'INSERT INTO maps (name, ridings) VALUES ($1, $2::jsonb) ON CONFLICT (name) DO NOTHING',
                [name, JSON.stringify(ridings)]
            );
            if (res.rowCount) {
                await client.query('UPDATE save_throttle SET last_saved_at = clock_timestamp() WHERE id = 1');
                await client.query('COMMIT');
                return name;
            }
        }
        throw new Error('Failed to generate unique map name');
    } catch (err) {
        if (!(err instanceof SaveRateLimitedError)) {
            await client.query('ROLLBACK').catch(() => {});
        }
        throw err;
    } finally {
        client.release();
    }
}

export async function getMap(name: string): Promise<SavedMap | null> {
    await ensureSchema();
    const res = await getPool().query<{ name: string; ridings: PartyRidings; created_at: Date }>(
        'SELECT name, ridings, created_at FROM maps WHERE name = $1',
        [name]
    );
    if (!res.rowCount) return null;
    const row = res.rows[0];
    return {name: row.name, ridings: sanitizeRidings(row.ridings), createdAt: row.created_at.toISOString()};
}
