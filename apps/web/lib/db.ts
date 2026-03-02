import "server-only"
import { Pool } from "pg"

const defaultDatabaseUrl = "postgresql://localhost:5432/link_shortener"
const legacySslModes = new Set(["prefer", "require", "verify-ca"])

declare global {
  var __linkShortenerPool: Pool | undefined
}

const envDatabaseUrl = process.env.DATABASE_URL?.trim()

const normalizeDatabaseUrl = (databaseUrl: string) => {
  try {
    const parsedUrl = new URL(databaseUrl)
    const sslMode = parsedUrl.searchParams.get("sslmode")?.toLowerCase()
    const useLibpqCompat =
      parsedUrl.searchParams.get("uselibpqcompat")?.toLowerCase() === "true"

    if (sslMode && legacySslModes.has(sslMode) && !useLibpqCompat) {
      parsedUrl.searchParams.set("sslmode", "verify-full")
      return parsedUrl.toString()
    }

    return databaseUrl
  } catch {
    return databaseUrl
  }
}

const connectionString = envDatabaseUrl
  ? normalizeDatabaseUrl(envDatabaseUrl)
  : defaultDatabaseUrl

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
    const databaseUrl = new URL(connectionString)
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
