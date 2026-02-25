import { Pool } from "pg";

const defaultDatabaseUrl = "postgresql://localhost:5432/link_shortener";

declare global {
  var __linkShortenerPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL ?? defaultDatabaseUrl;

export const dbPool =
  globalThis.__linkShortenerPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__linkShortenerPool = dbPool;
}
