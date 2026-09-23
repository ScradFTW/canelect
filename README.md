# Election Map

An interactive riding-by-riding prediction map for the Canadian federal election.
Click ridings to assign them to a party, save your map, and share the link. No
accounts, no sign-in: every saved map is public and anonymous.

- **Draft**: the home page is your map. Click any of the 343 federal ridings to cycle
  through parties. The draft is kept in your browser until you save it.
- **Save & share**: saving publishes an immutable copy under a random Canada-themed name
  (e.g. `polite-moose`) at `/map/<name>`.
- **Browse**: `/entries` lists every saved map with per-party counts, alongside the
  338Canada and Poliwave projections. Sort and filter them however you like.
- **Edit a copy**: open any saved map or projection and start a new draft from it.
- **Export**: download a map as a PNG.

Built with [Next.js](https://nextjs.org) (App Router), React,
[Leaflet](https://leafletjs.com) and PostgreSQL.

## Running locally

Requires Node.js 20.9 or newer and a PostgreSQL database.

```bash
npm install
cp .env.local.example .env.local   # then set DATABASE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The `maps` table is created
automatically on first use.

No database handy? Start a throwaway one with Docker:

```bash
docker run -d --rm --name electionmap-db -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16-alpine
# DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres
```

## Scripts

| Command             | What it does                     |
|---------------------|----------------------------------|
| `npm run dev`       | Dev server (Turbopack)           |
| `npm run build`     | Production build                 |
| `npm start`         | Serve the production build       |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | TypeScript type check            |

## API

| Route                  | Method | What it does                                                                 |
|------------------------|--------|------------------------------------------------------------------------------|
| `/api/maps`            | GET    | List saved maps with party counts. Supports `page`, `limit`, `sortKey`, `sortAsc`, `hideIncomplete`, `hideSingleParty`. |
| `/api/maps`            | POST   | Save `{ "ridings": { "<ridingId>": "<party>" } }`; returns the generated `name`. Limited to 10 saves per IP per 10 minutes. |
| `/api/maps/<name>`     | GET    | One saved map.                                                               |

Saved maps are validated on the server: only the 343 known riding IDs and the five
party names are accepted.

## Project layout

```
src/
  app/                 Routes (App Router): pages, layout and API route handlers
    map/[name]/        Read-only view of one saved map
    api/maps/          Public maps API
  components/          CanadaMap (the Leaflet map) and supporting UI
  data/                Riding boundaries and riding → province lookups
  lib/                 Postgres pool, map storage/validation, rate limiting
  localization/        UI strings
public/                Static projection files (338Canada, Poliwave)
scripts/               Data-prep and migration helpers
```

## Deployment

Production runs on Google Cloud Run at
[electionmap.bradjobe.dev](https://electionmap.bradjobe.dev), with Cloud SQL
Postgres. The infrastructure lives in
[bradjobe-dev-infra](https://github.com/ScradFTW/bradjobe-dev-infra) (`electionmap.tf`).
Every push to `main` runs `cloudbuild.yaml`, which lints, typechecks, builds the
`Dockerfile` (Next.js standalone output) and deploys a new revision.

Environment variables the container reads at runtime:

| Variable             | Purpose                                                                                  |
|----------------------|------------------------------------------------------------------------------------------|
| `DATABASE_URL`       | Postgres connection string (from Secret Manager in production)                           |
| `TRUSTED_PROXY_HOPS` | Proxies in front of the app that append to `X-Forwarded-For`. 2 behind Google's load balancer; defaults to 1. |

`NEXT_PUBLIC_GA_ID` and `NEXT_PUBLIC_SITE_URL` are baked in at build time (Docker
build args, set in `cloudbuild.yaml`).

### Migrating from the sign-in version

Earlier versions required sign-in and stored one map per user in a `users` table
keyed by Firebase UID. `scripts/migrate-to-anonymous-maps.sql` copies those maps
into the anonymous `maps` table, keeping each map's name so old share links still
work (`/?sillyName=<name>` redirects to `/map/<name>`). See the infra repo's
README for the full runbook.

## Data sources

- Riding boundaries: Statistics Canada / Elections Canada federal electoral districts (2023 representation order)
- Projections: [338Canada](https://338canada.com) and [Poliwave](https://poliwave.com)

## License

[MIT](LICENSE)
