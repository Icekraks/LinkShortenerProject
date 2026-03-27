import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isLoginRateLimited, LOGIN_RATE_LIMIT } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest } from "@/helpers/urlHelpers"
import { createPasswordResetToken } from "@/lib/authVerification"
import { dbPool } from "@/lib/db"
import { sendPasswordResetEmail, sendSsoLoginHintEmail } from "@/lib/transactionalEmail"

export const runtime = "nodejs"

const PASSWORD_RESET_TTL_MINUTES = 60

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const isValidEmail = (email: string) => {
  if (!email || email.length > 320) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const parseAndValidateBody = async (request: NextRequest) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return { error: "Invalid JSON body" }
  }

  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" }
  }

  const maybeEmail = (body as { email?: unknown }).email

  if (typeof maybeEmail !== "string") {
    return { error: "Email is required" }
  }

  const email = normalizeEmail(maybeEmail)

  if (!isValidEmail(email)) {
    return { error: "Please provide a valid email address" }
  }

  return { email }
}

const buildPasswordResetUrl = (request: NextRequest, token: string) => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()

  try {
    const baseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
    baseUrl.pathname = "/account/reset-password"
    baseUrl.search = ""
    baseUrl.searchParams.set("token", token)
    return baseUrl.toString()
  } catch {
    const fallbackUrl = new URL(request.nextUrl.origin)
    fallbackUrl.pathname = "/account/reset-password"
    fallbackUrl.search = ""
    fallbackUrl.searchParams.set("token", token)
    return fallbackUrl.toString()
  }
}

const buildLoginUrl = (request: NextRequest) => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()

  try {
    const baseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
    baseUrl.pathname = "/account/login"
    baseUrl.search = ""
    return baseUrl.toString()
  } catch {
    const fallbackUrl = new URL(request.nextUrl.origin)
    fallbackUrl.pathname = "/account/login"
    fallbackUrl.search = ""
    return fallbackUrl.toString()
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rateLimited = await isLoginRateLimited(request)

    if (rateLimited) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterSeconds: LOGIN_RATE_LIMIT.windowSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(LOGIN_RATE_LIMIT.windowSeconds),
          },
        },
      )
    }

    const parsed = await parseAndValidateBody(request)

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { email } = parsed

    const userResult = await dbPool.query<{
      id: string
      email: string
      has_password: boolean
      providers: string[] | null
    }>(
      `SELECT
         u.id,
         u.email,
         EXISTS(
           SELECT 1
           FROM user_credentials uc
           WHERE uc.user_id = u.id
         ) AS has_password,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.provider), NULL) AS providers
       FROM users u
       LEFT JOIN accounts a ON a.user_id = u.id
       WHERE u.email = $1
       GROUP BY u.id, u.email`,
      [email],
    )

    const user = userResult.rows[0]

    if (user) {
      if (user.has_password !== false) {
        const token = await createPasswordResetToken(dbPool, {
          userId: user.id,
          email: user.email,
          ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
        })

        const resetUrl = buildPasswordResetUrl(request, token)

        await sendPasswordResetEmail({
          to: user.email,
          resetUrl,
        })
      } else {
        const loginUrl = buildLoginUrl(request)

        await sendSsoLoginHintEmail({
          to: user.email,
          loginUrl,
          providers: user.providers ?? [],
        })
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("Failed to send password reset email", error)
    return NextResponse.json({ error: "Failed to send password reset email" }, { status: 500 })
  }
}
