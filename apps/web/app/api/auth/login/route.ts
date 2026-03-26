import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

import { dbPool } from "@/lib/db"
import { isLoginRateLimited, LOGIN_RATE_LIMIT } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest } from "@/helpers/urlHelpers"
import { buildVerificationUrl, createEmailVerificationToken } from "@/lib/authVerification"
import { createSignedAuthSessionToken } from "@lib/authToken"
import { AUTH_SESSION_COOKIE_NAME } from "@/lib/authSession"
import { sendEmailVerificationEmail } from "@/lib/transactionalEmail"

export const runtime = "nodejs"

const scryptAsync = promisify(scryptCallback)

const PASSWORD_HASH_KEY_LENGTH = 64
const SESSION_TTL_DAYS = 30
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
  const maybePassword = (body as { password?: unknown }).password

  if (typeof maybeEmail !== "string" || typeof maybePassword !== "string") {
    return { error: "Email and password are required" }
  }

  const email = normalizeEmail(maybeEmail)
  const password = maybePassword

  if (!isValidEmail(email)) {
    return { error: "Please provide a valid email address" }
  }

  if (password.length < 1 || password.length > 256) {
    return { error: "Password is required" }
  }

  return { email, password }
}

const parseScryptHash = (passwordHash: string) => {
  const parts = passwordHash.split("$")

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return null
  }

  const salt = Buffer.from(parts[1], "hex")
  const expectedKey = Buffer.from(parts[2], "hex")

  if (salt.length === 0 || expectedKey.length !== PASSWORD_HASH_KEY_LENGTH) {
    return null
  }

  return { salt, expectedKey }
}

const verifyPassword = async (password: string, passwordHash: string, algorithm: string) => {
  if (algorithm !== "scrypt") {
    return false
  }

  const parsedHash = parseScryptHash(passwordHash)

  if (!parsedHash) {
    return false
  }

  const derivedKey = (await scryptAsync(
    password,
    parsedHash.salt,
    PASSWORD_HASH_KEY_LENGTH,
  )) as Buffer
  return timingSafeEqual(derivedKey, parsedHash.expectedKey)
}

const buildSessionExpiry = () => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)
  return expiresAt
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

    const { email, password } = parsed
    const client = await dbPool.connect()

    try {
      const credentialResult = await client.query<{
        id: string
        email: string
        email_verified: boolean
        password_hash: string
        password_algorithm: string
      }>(
        `SELECT u.id, u.email, u.email_verified, uc.password_hash, uc.password_algorithm
         FROM users u
         INNER JOIN user_credentials uc ON uc.user_id = u.id
         WHERE u.email = $1`,
        [email],
      )

      const credential = credentialResult.rows[0]

      if (!credential) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }

      const passwordMatches = await verifyPassword(
        password,
        credential.password_hash,
        credential.password_algorithm,
      )

      if (!passwordMatches) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
      }

      if (!credential.email_verified) {
        const pendingTokenResult = await client.query<{ id: string }>(
          `SELECT id FROM auth_verification_tokens
           WHERE user_id = $1
             AND purpose = 'email_verify'
             AND consumed_at IS NULL
             AND expires_at > NOW()
           LIMIT 1`,
          [credential.id],
        )

        let verificationEmailSent = false

        if (!pendingTokenResult.rows[0]) {
          const token = await createEmailVerificationToken(client, {
            userId: credential.id,
            email: credential.email,
            ttlMinutes: EMAIL_VERIFICATION_TTL_MINUTES,
          })

          const verificationUrl = buildVerificationUrl(request, token)
          const emailResult = await sendEmailVerificationEmail({
            to: credential.email,
            verificationUrl,
          })
          verificationEmailSent = emailResult.sent
        }

        return NextResponse.json(
          {
            error: "Please verify your email before logging in",
            code: "EMAIL_NOT_VERIFIED",
            verificationEmailSent,
          },
          { status: 403 },
        )
      }

      const expiresAt = buildSessionExpiry()
      const sessionToken = createSignedAuthSessionToken({
        userId: credential.id,
        expiresAt,
      })

      const response = NextResponse.json(
        {
          ok: true,
          user: {
            id: credential.id,
            email: credential.email,
            emailVerified: credential.email_verified,
          },
        },
        { status: 200 },
      )

      response.cookies.set({
        name: AUTH_SESSION_COOKIE_NAME,
        value: sessionToken,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: expiresAt,
      })

      return response
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Failed to login user", error)
    return NextResponse.json({ error: "Failed to login user" }, { status: 500 })
  }
}
