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

/** Stores a new map under a fresh random name and returns that name. */
export async function createMap(ridings: PartyRidings): Promise<string> {
    await ensureSchema();
    // Retry on name collisions; after enough tries, add a number suffix
    for (let attempt = 0; attempt < 50; attempt++) {
        const base = makeRandomSillyName();
        const name = attempt < 25 ? base : `${base}-${randomInt(10, 1000)}`;
        const res = await getPool().query(
            'INSERT INTO maps (name, ridings) VALUES ($1, $2::jsonb) ON CONFLICT (name) DO NOTHING',
            [name, JSON.stringify(ridings)]
        );
        if (res.rowCount) return name;
    }
    throw new Error('Failed to generate unique map name');
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
