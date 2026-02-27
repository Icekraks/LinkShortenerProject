# Link Shortener Monorepo

Minimal URL shortener built with Next.js and PostgreSQL.

## Workspace Structure

- `apps/web`: Next.js application (API routes + UI)
- `apps/db`: PostgreSQL schema and maintenance SQL

## Requirements

- Node.js `>=24.12.0`
- `pnpm`
- PostgreSQL (local or remote)

For local macOS setup:

```bash
brew install postgresql@18 libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Environment Variables

Create either `.env` / `.env.local` at repo root, or `apps/web/.env.local`.

```env
DATABASE_URL=postgresql://<user>:<password>@<your-neon-host>.neon.tech/<db>?sslmode=require
HASHIDS_SALT=replace-with-a-long-random-secret
```

Notes:

- `HASHIDS_SALT` is required at startup (`apps/web/next.config.ts`).
- `DATABASE_URL` falls back to `postgresql://localhost:5432/link_shortener` when empty.
- `DATABASE_SSL=false` forces SSL off.
- Otherwise, SSL is enabled when `DATABASE_SSL=true` or `sslmode` in `DATABASE_URL` is `require`, `verify-ca`, or `verify-full`.

## Run the App

```bash
pnpm install
pnpm dev
```

App URL: `http://localhost:3000`

## Scripts (Root)

- `pnpm dev`: start web app
- `pnpm dev:full`: start local Postgres service + web app
- `pnpm build`: build web app
- `pnpm start`: start production server
- `pnpm lint`: run ESLint for web app
- `pnpm format`: run Prettier write
- `pnpm format:check`: check Prettier formatting

### Database Scripts

- `pnpm db:start`: start Postgres service
- `pnpm db:stop`: stop Postgres service
- `pnpm db:status`: show Postgres service status
- `pnpm db:setup`: auto setup (apply/init based on `DATABASE_URL`)
- `pnpm db:apply`: apply `apps/db/schema.sql` to `DATABASE_URL`
- `pnpm db:init`: create local DB and apply schema
- `pnpm db:reset`: drop/recreate local DB and reapply schema
- `pnpm db:cleanup`: remove expired links

## Short Link Behavior

- Short codes are stored as lowercase alphanumeric (`a-z0-9`) with min length 4.
- Codes are generated via Hashids (`apps/web/lib/shortCode.ts`) from DB ids using `HASHIDS_SALT`.
- Create endpoint blocks:
  - cross-origin requests (same-origin check)
  - self-domain target URLs
  - invalid expiry windows
- Resolve endpoint validates code format, checks expiry, and redirects with `307`.

## Rate Limiting

Rate limit events are tracked in `rate_limit_events`.

- Create link endpoint: 10 requests / 60s per client identifier
- Resolve endpoint: 120 requests / 60s per client identifier

## Database Schema

`apps/db/schema.sql` creates:

- `links`
  - `id BIGSERIAL PRIMARY KEY`
  - `short_code TEXT UNIQUE` with format check `^[a-z0-9]{4,}$`
  - `original_url`, `created_at`, `expires_at`
- `rate_limit_events`
  - `endpoint`, `identifier`, `created_at`

## Testing

### Unit/Route Tests (mocked)

```bash
pnpm test
pnpm test:ci
```

### Integration Tests (real DB)

```bash
pnpm test:integration
```

Integration tests run only when `INTEGRATION_DATABASE_URL` is set; otherwise they are skipped.

## Git Hooks and CI

- Husky pre-commit hook runs `pnpm test:ci`
- GitHub Actions (`.github/workflows/pr-checks.yml`):
  - `test-and-lint` job: install + lint + unit tests
  - `integration-tests` job: runs against PostgreSQL service container

## Scheduled Cleanup (Vercel Cron)

- Cron config: `apps/web/vercel.json`
- Route: `GET|POST /api/cron/cleanup`
- Schedule: `0 3 * * *` (daily at 03:00 UTC)
- Required env token on deployment target:
  - `CRON_SECRET` (recommended), or
  - `CRON_AUTH_TOKEN`
