import "server-only"
import { Pool } from "pg"

const defaultDatabaseUrl = "postgresql://localhost:5432/link_shortener"

declare global {
  var __linkShortenerPool: Pool | undefined
}

const envDatabaseUrl = process.env.DATABASE_URL?.trim()
const connectionString = envDatabaseUrl ? envDatabaseUrl : defaultDatabaseUrl

const useSsl = (() => {
  if (process.env.DATABASE_SSL === "false") {
    return false
  }

  if (process.env.DATABASE_SSL === "true") {
    return true
  }

  if (!envDatabaseUrl) {
    return false
  }

  try {
    const databaseUrl = new URL(envDatabaseUrl)
    const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase()

    return sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full"
  } catch {
    return false
  }
})()

export const dbPool =
  globalThis.__linkShortenerPool ??
  new Pool({
    connectionString,
    max: 5, // Limit the number of connections in the pool
    ...(useSsl
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  })

if (process.env.NODE_ENV !== "production") {
  globalThis.__linkShortenerPool = dbPool
}
