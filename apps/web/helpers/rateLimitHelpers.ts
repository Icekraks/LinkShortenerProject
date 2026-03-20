import "server-only"
import type { NextRequest } from "next/server"

import { dbPool } from "@/lib/db"
import { RATE_LIMIT_CHECK_QUERY } from "@/sql/rateLimitCheck"

export const CREATE_LINK_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 60,
}

export const RESOLVE_LINK_RATE_LIMIT = {
  maxRequests: 120,
  windowSeconds: 60,
}

export const LOGIN_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 60,
}

export const REGISTER_RATE_LIMIT = {
  maxRequests: 5,
  windowSeconds: 60,
}

const CREATE_LINK_ENDPOINT = "create-shortlink"
const RESOLVE_LINK_ENDPOINT = "resolve-shortlink"
const LOGIN_ENDPOINT = "auth-login"
const REGISTER_ENDPOINT = "auth-register"

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

  const result = await dbPool.query<{ request_count: number }>(RATE_LIMIT_CHECK_QUERY, [
    CREATE_LINK_ENDPOINT,
    identifier,
    CREATE_LINK_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > CREATE_LINK_RATE_LIMIT.maxRequests
}

export const isResolveLinkRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)

  const result = await dbPool.query<{ request_count: number }>(RATE_LIMIT_CHECK_QUERY, [
    RESOLVE_LINK_ENDPOINT,
    identifier,
    RESOLVE_LINK_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > RESOLVE_LINK_RATE_LIMIT.maxRequests
}

export const isLoginRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)

  const result = await dbPool.query<{ request_count: number }>(RATE_LIMIT_CHECK_QUERY, [
    LOGIN_ENDPOINT,
    identifier,
    LOGIN_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > LOGIN_RATE_LIMIT.maxRequests
}

export const isRegisterRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request)

  const result = await dbPool.query<{ request_count: number }>(RATE_LIMIT_CHECK_QUERY, [
    REGISTER_ENDPOINT,
    identifier,
    REGISTER_RATE_LIMIT.windowSeconds,
  ])

  const requestCount = result.rows[0]?.request_count ?? 0
  return requestCount > REGISTER_RATE_LIMIT.maxRequests
}
