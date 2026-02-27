import { dbPool } from "@/lib/db"
import {
  DELETE_EXPIRED_LINKS_QUERY,
  DELETE_OLD_RATE_LIMIT_EVENTS_QUERY,
} from "@/sql/cleanupShortLink"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const runtime = "nodejs"

const getProvidedToken = (request: NextRequest) => {
  const authorizationHeader = request.headers.get("authorization")
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length).trim()
  }

  const cronHeaderToken = request.headers.get("x-cron-token")?.trim()
  if (cronHeaderToken) {
    return cronHeaderToken
  }

  return null
}

async function runCleanup(request: NextRequest) {
  const expectedToken = process.env.CRON_AUTH_TOKEN?.trim() ?? process.env.CRON_SECRET?.trim()
  const providedToken = getProvidedToken(request)

  try {
    if (!expectedToken) {
      return NextResponse.json(
        { error: "CRON_AUTH_TOKEN or CRON_SECRET is not configured" },
        { status: 500 },
      )
    }

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const expiredLinksResult = await dbPool.query<{ deleted_count: number }>(
      DELETE_EXPIRED_LINKS_QUERY,
    )
    const rateLimitEventsResult = await dbPool.query<{ deleted_count: number }>(
      DELETE_OLD_RATE_LIMIT_EVENTS_QUERY,
    )

    return NextResponse.json({
      message: "Cleanup completed successfully",
      deletedExpiredLinks: expiredLinksResult.rows[0]?.deleted_count ?? 0,
      deletedRateLimitEvents: rateLimitEventsResult.rows[0]?.deleted_count ?? 0,
    })
  } catch (error) {
    console.error("Error during cleanup", error)
    return NextResponse.json({ error: "Error during cleanup" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return runCleanup(request)
}

export async function GET(request: NextRequest) {
  return runCleanup(request)
}
