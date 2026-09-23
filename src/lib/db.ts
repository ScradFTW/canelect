import 'server-only';
import {Pool} from 'pg';

// Reuse the pool across hot reloads in development
const globalForDb = globalThis as unknown as {pgPool?: Pool};

/** Shared Postgres pool, created on first use so builds don't need a database. */
export function getPool(): Pool {
    if (globalForDb.pgPool) return globalForDb.pgPool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not set. Copy .env.local.example to .env.local and fill it in.');
    }
    // Small per-instance cap: a few Cloud Run instances must fit within a
    // small Cloud SQL tier's connection limit (~25 on db-f1-micro)
    globalForDb.pgPool = new Pool({connectionString, max: 5});
    return globalForDb.pgPool;
}

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS maps
    (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE NOT NULL,
        ridings    JSONB       NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
`;

let schemaReady: Promise<void> | null = null;

/** Creates the tables on first use; later calls reuse the same promise. */
export function ensureSchema(): Promise<void> {
    schemaReady ??= getPool().query(SCHEMA).then(() => undefined, (err) => {
        schemaReady = null;
        throw err;
    });
    return schemaReady;
}
