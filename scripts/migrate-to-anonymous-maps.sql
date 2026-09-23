-- One-time migration from the sign-in version of the site (users + map_versions
-- tables keyed by Firebase UID) to anonymous public maps.
--
-- Copies each user's current map into `maps`, keeping its silly name so old
-- share links (/map/<name> and /?sillyName=<name>) still resolve. Safe to re-run.
--
--   psql "$DATABASE_URL" -f scripts/migrate-to-anonymous-maps.sql

BEGIN;

CREATE TABLE IF NOT EXISTS maps
(
    id         SERIAL PRIMARY KEY,
    name       TEXT UNIQUE NOT NULL,
    ridings    JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO maps (name, ridings, created_at)
SELECT silly_name,
       -- drop undecided (null) ridings, matching what the app now stores
       COALESCE((SELECT jsonb_object_agg(key, value)
                 FROM jsonb_each(ridings)
                 WHERE value <> 'null'::jsonb), '{}'::jsonb),
       COALESCE(updated_at, NOW())
FROM users
WHERE EXISTS (SELECT 1 FROM jsonb_each(ridings) WHERE value <> 'null'::jsonb)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- The old tables hold Firebase UIDs. Once you've checked the migrated maps,
-- drop them so no per-user data remains:
--
--   DROP TABLE map_versions;
--   DROP TABLE users;
