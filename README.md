# Link Shortener Monorepo

This repo is now structured as a monorepo.

## Structure

- `apps/web` – Next.js app
- `apps/db` – Postgres config + schema
- `packages/*` – shared packages (optional, for future use)

## Prerequisites (no Docker)

- Node.js + pnpm
- Homebrew
- PostgreSQL 18 + libpq CLI via Homebrew:

```bash
brew install postgresql@18 libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Commands

From repo root:

```bash
pnpm install
pnpm dev
```

- `pnpm dev` runs the Next.js app from `apps/web`
- `pnpm dev:full` starts local Postgres (Homebrew service) and then runs Next.js
- `pnpm db:start` starts Postgres
- `pnpm db:stop` stops Postgres
- `pnpm db:status` shows Postgres service status
- `pnpm db:setup` one-command DB setup (uses `DATABASE_URL` on host, local init otherwise)
- `pnpm db:apply` applies schema directly to `DATABASE_URL`
- `pnpm db:init` creates `link_shortener` and applies `apps/db/schema.sql`
- `pnpm db:reset` drops and recreates `link_shortener` + tables

`db:setup` and `db:apply` auto-load env vars from `.env`, `.env.local`, and `apps/web/.env.local`.

## Default link schema

The `links` table includes:

- `id` (BIGSERIAL primary key)
- `short_code` (auto-generated base62, 4 chars)
- `original_url` (URL before shortening)
- `created_at` (creation timestamp)
- `expires_at` (expiry timestamp)

## App URL

- http://localhost:3000

## Optional local DB env

Create `apps/web/.env.local` if needed:

```env
DATABASE_URL=postgresql://localhost:5432/link_shortener
```
