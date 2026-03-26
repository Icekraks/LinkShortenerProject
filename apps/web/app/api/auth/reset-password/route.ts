import { isLoginRateLimited, LOGIN_RATE_LIMIT } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest } from "@/helpers/urlHelpers"
import { dbPool } from "@/lib/db"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createHash, randomBytes, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"

export const runtime = "nodejs"

const scryptAsync = promisify(scryptCallback)
const PASSWORD_HASH_KEY_LENGTH = 64

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const isValidEmail = (email: string) => {
  if (!email || email.length > 320) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const hasStrongPassword = (password: string) => {
  if (password.length < 8 || password.length > 256) {
    return false
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)

  return hasUpper && hasLower && hasNumber
}

const hashPassword = async (password: string) => {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, PASSWORD_HASH_KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

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
  const maybeToken = (body as { token?: unknown }).token

  if (typeof maybeEmail !== "string" || typeof maybePassword !== "string") {
    return { error: "Email and password are required" }
  }

  const email = normalizeEmail(maybeEmail)
  const password = maybePassword
  const tokenFromBody = typeof maybeToken === "string" ? maybeToken.trim() : undefined

  if (!isValidEmail(email)) {
    return { error: "Please provide a valid email address" }
  }

  if (!hasStrongPassword(password)) {
    return {
      error:
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
    }
  }

  return { email, password, tokenFromBody }
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

    const token = request.nextUrl.searchParams.get("token")?.trim() ?? parsed.tokenFromBody

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const { email, password } = parsed
    const tokenHash = hashToken(token)
    const passwordHash = await hashPassword(password)

    const client = await dbPool.connect()

    try {
      await client.query("BEGIN")

      const tokenResult = await client.query<{
        id: string
        user_id: string | null
        email: string
      }>(
        `SELECT id, user_id, email
         FROM auth_verification_tokens
         WHERE token_hash = $1
           AND lower(email::text) = lower($2::text)
           AND purpose = 'password_reset'
           AND consumed_at IS NULL
           AND expires_at > NOW()
         FOR UPDATE`,
        [tokenHash, email],
      )

      const tokenRow = tokenResult.rows[0]

      if (!tokenRow?.user_id) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
      }

      await client.query(
        `INSERT INTO user_credentials (user_id, password_hash, password_algorithm, password_updated_at)
         VALUES ($1, $2, 'scrypt', NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           password_algorithm = EXCLUDED.password_algorithm,
           password_updated_at = NOW()`,
        [tokenRow.user_id, passwordHash],
      )

      await client.query(
        `UPDATE auth_verification_tokens
         SET consumed_at = NOW()
         WHERE id = $1`,
        [tokenRow.id],
      )

      await client.query("COMMIT")
      return NextResponse.json({ ok: true }, { status: 200 })
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Failed to reset password", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
