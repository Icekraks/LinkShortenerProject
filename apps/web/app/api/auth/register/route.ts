import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomBytes, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"

import { dbPool } from "@/lib/db"
import { isRegisterRateLimited, REGISTER_RATE_LIMIT } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest } from "@/helpers/urlHelpers"

export const runtime = "nodejs"

const scryptAsync = promisify(scryptCallback)

const MIN_PASSWORD_LENGTH = 8
const PASSWORD_HASH_KEY_LENGTH = 64

const isUniqueViolationError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybePgError = error as { code?: string; constraint?: string }
  return maybePgError.code === "23505" && maybePgError.constraint === "users_email_key"
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const isValidEmail = (email: string) => {
  if (!email || email.length > 320) {
    return false
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const hasStrongPassword = (password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 256) {
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

  if (!hasStrongPassword(password)) {
    return {
      error:
        "Password must be at least 8 characters and include uppercase, lowercase, and a number",
    }
  }

  return { email, password }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rateLimited = await isRegisterRateLimited(request)

    if (rateLimited) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterSeconds: REGISTER_RATE_LIMIT.windowSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(REGISTER_RATE_LIMIT.windowSeconds),
          },
        },
      )
    }

    const parsed = await parseAndValidateBody(request)

    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { email, password } = parsed
    const passwordHash = await hashPassword(password)

    const client = await dbPool.connect()

    try {
      await client.query("BEGIN")

      const userResult = await client.query<{
        id: string
        email: string
        email_verified: boolean
      }>(
        `INSERT INTO users (email)
         VALUES ($1)
         RETURNING id, email, email_verified`,
        [email],
      )

      const createdUser = userResult.rows[0]

      if (!createdUser) {
        throw new Error("Failed to create user")
      }

      await client.query(
        `INSERT INTO user_credentials (user_id, password_hash, password_algorithm)
         VALUES ($1, $2, 'scrypt')`,
        [createdUser.id, passwordHash],
      )

      await client.query("COMMIT")

      return NextResponse.json(
        {
          ok: true,
          user: {
            id: createdUser.id,
            email: createdUser.email,
            emailVerified: createdUser.email_verified,
          },
        },
        { status: 201 },
      )
    } catch (error) {
      await client.query("ROLLBACK")

      if (isUniqueViolationError(error)) {
        return NextResponse.json({ error: "Email is already registered" }, { status: 409 })
      }

      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Failed to register user", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
