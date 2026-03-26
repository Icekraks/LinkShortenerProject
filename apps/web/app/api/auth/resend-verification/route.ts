import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isLoginRateLimited, LOGIN_RATE_LIMIT } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest } from "@/helpers/urlHelpers"
import { createEmailVerificationToken } from "@/lib/authVerification"
import { dbPool } from "@/lib/db"
import { sendEmailVerificationEmail } from "@/lib/transactionalEmail"

export const runtime = "nodejs"

const EMAIL_VERIFICATION_TTL_MINUTES = 60 * 24

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

const buildVerificationUrl = (request: NextRequest, token: string) => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()

  try {
    const baseUrl = configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
    baseUrl.pathname = "/api/auth/verify-email"
    baseUrl.search = ""
    baseUrl.searchParams.set("token", token)
    return baseUrl.toString()
  } catch {
    const fallbackUrl = new URL(request.nextUrl.origin)
    fallbackUrl.pathname = "/api/auth/verify-email"
    fallbackUrl.search = ""
    fallbackUrl.searchParams.set("token", token)
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
      email_verified: boolean
    }>(
      `SELECT id, email, email_verified
       FROM users
       WHERE email = $1`,
      [email],
    )

    const user = userResult.rows[0]

    if (user && !user.email_verified) {
      const token = await createEmailVerificationToken(dbPool, {
        userId: user.id,
        email: user.email,
        ttlMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
      })

      const verificationUrl = buildVerificationUrl(request, token)

      await sendEmailVerificationEmail({
        to: user.email,
        verificationUrl,
      })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("Failed to resend verification email", error)
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 })
  }
}
