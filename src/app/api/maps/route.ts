import {NextRequest, NextResponse} from 'next/server';
import {ensureSchema, getPool} from '@/lib/db';
import {createMap, parseRidings, SaveRateLimitedError} from '@/lib/maps';
import {clientIp, createRateLimiter} from '@/lib/rate-limit';

type Entry = {
    name: string;
    created_at: string;
    total_count: number;
    liberal: number;
    conservative: number;
    ndp: number;
    green: number;
    bloc: number;
};

type ResponseData = {
    page: number;
    limit: number;
    total: number;
    filtered_count: number;
    entries: Entry[];
};

const PARTY_SORT_KEYS: Record<string, string> = {
    liberal: 'Liberal',
    conservative: 'Conservative',
    ndp: 'NDP',
    green: 'Green',
    bloc: 'Bloc Quebecois',
};

// Each listed map runs several jsonb subqueries, so keep pages small
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 100_000;

// A full 343-riding map is ~12KB of JSON; anything far bigger isn't a map
const MAX_BODY_BYTES = 64 * 1024;

const ASSIGNED_COUNT = '(SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value IS NOT NULL)';

// List all saved maps, with per-party counts, filters, sorting and pagination
export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;

    // Pagination params
    const pageQuery = parseInt(params.get('page') ?? '1', 10);
    const limitQuery = parseInt(params.get('limit') ?? String(MAX_PAGE_SIZE), 10);
    const page = pageQuery > 0 && pageQuery <= MAX_PAGE ? pageQuery : 1;
    const limit = limitQuery > 0 && limitQuery <= MAX_PAGE_SIZE ? limitQuery : MAX_PAGE_SIZE;
    const offset = (page - 1) * limit;

    // Filter params
    const hideIncomplete = params.get('hideIncomplete') === 'true';
    const hideSingleParty = params.get('hideSingleParty') === 'true';

    // Sorting params; only allowlisted keys reach the SQL
    const sortKey = params.get('sortKey') ?? '';
    const direction = params.get('sortAsc') === 'true' ? 'ASC' : 'DESC';

    let orderClause = 'created_at DESC';
    if (sortKey === 'name' || sortKey === 'created_at') {
        orderClause = `${sortKey} ${direction}`;
    } else if (sortKey === 'total_count') {
        orderClause = `${ASSIGNED_COUNT} ${direction}`;
    } else if (Object.hasOwn(PARTY_SORT_KEYS, sortKey)) {
        orderClause = `(SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = '${PARTY_SORT_KEYS[sortKey]}') ${direction}`;
    }

    // Build the WHERE clause based on filters
    let whereClause = `WHERE ${ASSIGNED_COUNT} > 0`;
    if (hideIncomplete) {
        whereClause += ` AND ${ASSIGNED_COUNT} >= 343`;
    }
    if (hideSingleParty) {
        whereClause += `
            AND NOT EXISTS (
                SELECT 1
                FROM jsonb_each_text(ridings)
                WHERE value IS NOT NULL
                GROUP BY value
                HAVING COUNT(*) > 274
            )`;
    }

    try {
        await ensureSchema();

        const [totalRes, filteredRes, dataRes] = await Promise.all([
            getPool().query<{ count: string }>(`SELECT COUNT(*) AS count FROM maps WHERE ${ASSIGNED_COUNT} > 0`),
            getPool().query<{ count: string }>(`SELECT COUNT(*) AS count FROM maps ${whereClause}`),
            getPool().query(
                `SELECT name,
                        created_at,
                        ${ASSIGNED_COUNT} AS total_count,
                        (SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = 'Liberal')        AS liberal,
                        (SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = 'Conservative')   AS conservative,
                        (SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = 'NDP')            AS ndp,
                        (SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = 'Green')          AS green,
                        (SELECT COUNT(*) FROM jsonb_each_text(ridings) WHERE value = 'Bloc Quebecois') AS bloc
                 FROM maps
                 ${whereClause}
                 ORDER BY ${orderClause}
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
        ]);

        const entries: Entry[] = dataRes.rows.map(row => ({
            name: row.name,
            created_at: row.created_at,
            total_count: +row.total_count,
            liberal: +row.liberal,
            conservative: +row.conservative,
            ndp: +row.ndp,
            green: +row.green,
            bloc: +row.bloc,
        }));

        return NextResponse.json<ResponseData>({
            page,
            limit,
            total: parseInt(totalRes.rows[0].count, 10),
            filtered_count: parseInt(filteredRes.rows[0].count, 10),
            entries,
        });
    } catch (err) {
        console.error('Error in GET /api/maps', err);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}

/** Parses a JSON body, giving up (null) once it exceeds maxBytes rather than buffering it all. */
async function readJsonBody(req: NextRequest, maxBytes: number): Promise<unknown> {
    const declared = Number(req.headers.get('content-length') ?? 0);
    if (declared > maxBytes || !req.body) return null;

    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        return null;
    }
}

// No accounts, so cap anonymous saves per IP
const allowSave = createRateLimiter({limit: 10, windowMs: 10 * 60 * 1000});

// Save a new map; returns its generated name
export async function POST(req: NextRequest) {
    if (!allowSave(clientIp(req.headers))) {
        return NextResponse.json({error: 'You\'ve saved a lot of maps in a short time. Please wait a few minutes and try again.'}, {status: 429});
    }

    const body = await readJsonBody(req, MAX_BODY_BYTES) as { ridings?: unknown } | null;
    const ridings = parseRidings(body?.ridings);
    if (!ridings) {
        return NextResponse.json({error: 'Invalid payload – "ridings" must map riding IDs to parties.'}, {status: 400});
    }
    if (Object.keys(ridings).length === 0) {
        return NextResponse.json({error: 'Give at least one riding a party before saving.'}, {status: 400});
    }

    try {
        const name = await createMap(ridings);
        return NextResponse.json({name}, {status: 201});
    } catch (err) {
        if (err instanceof SaveRateLimitedError) {
            return NextResponse.json(
                {error: 'Lots of maps are being saved right now. Please try again in a moment.'},
                {status: 429, headers: {'Retry-After': '1'}},
            );
        }
        console.error('Error in POST /api/maps', err);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}
