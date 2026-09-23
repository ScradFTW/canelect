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

-- The old API stored whatever JSON a signed-in client sent, so copy only
-- entries the app itself would accept: a 5-digit riding ID mapped to one of
-- the five parties. Undecided (null) ridings are dropped, as the app does.
CREATE OR REPLACE TEMP VIEW valid_user_ridings AS
SELECT u.uid, r.key, r.value
FROM users u,
     jsonb_each_text(CASE WHEN jsonb_typeof(u.ridings) = 'object' THEN u.ridings ELSE '{}'::jsonb END) AS r(key, value)
WHERE r.key ~ '^[0-9]{5}$'
  AND r.value IN ('Liberal', 'Conservative', 'NDP', 'Green', 'Bloc Quebecois');

INSERT INTO maps (name, ridings, created_at)
SELECT u.silly_name,
       jsonb_object_agg(v.key, v.value),
       COALESCE(u.updated_at, NOW())
FROM users u
         JOIN valid_user_ridings v ON v.uid = u.uid
-- Names come from the old server-side generator; skip anything else
WHERE u.silly_name ~ '^[a-z0-9‑-]{1,64}$'
GROUP BY u.uid, u.silly_name, u.updated_at
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- The old tables hold Firebase UIDs. Once you've checked the migrated maps,
-- drop them so no per-user data remains:
--
--   DROP TABLE map_versions;
--   DROP TABLE users;
