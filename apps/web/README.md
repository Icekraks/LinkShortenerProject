# Web App (`apps/web`)

Next.js app for the Link Shortener project.

## Requirements

- Node.js `>=24.12.0`
- `pnpm`
- PostgreSQL (local or remote)

## Environment Variables

Set these in root `.env` / `.env.local` or `apps/web/.env.local`:

```env
DATABASE_URL=postgresql://localhost:5432/link_shortener
HASHIDS_SALT=replace-with-a-long-random-secret
```

Notes:

- `HASHIDS_SALT` is required at startup.
- If `DATABASE_URL` is empty, the app falls back to `postgresql://localhost:5432/link_shortener`.

## Scripts

From `apps/web`:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm test:run
pnpm test:integration
pnpm format
pnpm format:check
```

## API Routes

### `POST /api/generate-shortlink`

Creates a short link for an input URL.

Behavior:

- Same-origin request check (`403` if not same-origin)
- Per-client create rate limiting (`10 / 60s`)
- URL validation and expiry validation (`1, 4, 6, 12, 24` hours)
- Blocks self-domain targets
- Generates shortcode via Hashids (lowercase alphanumeric, min length 4)

### `GET /:shortCode`

Resolves and redirects to the original URL.

Behavior:

- Short code validation (`^[a-z0-9]{4,}$`)
- Per-client resolve rate limiting (`120 / 60s`)
- Returns `404` for missing/expired links
- Redirects with status `307` when found

## Testing

### Unit + Route tests (mocked)

```bash
pnpm test:run
```

### Integration tests (real DB)

```bash
INTEGRATION_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/link_shortener_test pnpm test:integration
```

If `INTEGRATION_DATABASE_URL` is not set, integration tests are skipped.

## Useful Files

- `app/api/generate-shortlink/route.ts`
- `app/[shortCode]/route.ts`
- `helpers/rateLimitHelpers.ts`
- `helpers/urlHelpers.ts`
- `lib/shortCode.ts`
- `sql/`
