import "server-only"
import type { NextRequest } from "next/server"

import { dbPool } from "@/lib/db"
import { CREATE_LINK_RATE_LIMIT_CHECK_QUERY } from "@/sql/rateLimitCheck"

export const CREATE_LINK_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 60,
}

export const RESOLVE_LINK_RATE_LIMIT = {
  maxRequests: 120,
  windowSeconds: 60,
}

const CREATE_LINK_ENDPOINT = "create-shortlink"
const RESOLVE_LINK_ENDPOINT = "resolve-shortlink"

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) {
    return realIp
  }

  return "unknown"
}

export const isCreateLinkRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)

  const result = await dbPool.query<{ request_count: number }>(CREATE_LINK_RATE_LIMIT_CHECK_QUERY, [
    CREATE_LINK_ENDPOINT,
    identifier,
    CREATE_LINK_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > CREATE_LINK_RATE_LIMIT.maxRequests
}

export const isResolveLinkRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)

  const result = await dbPool.query<{ request_count: number }>(CREATE_LINK_RATE_LIMIT_CHECK_QUERY, [
    RESOLVE_LINK_ENDPOINT,
    identifier,
    RESOLVE_LINK_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > RESOLVE_LINK_RATE_LIMIT.maxRequests
}
