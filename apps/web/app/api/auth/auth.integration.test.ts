import fs from "node:fs"
import path from "node:path"

import { NextRequest } from "next/server"
import { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
  redirect: () => {
    throw new Error("NEXT_REDIRECT")
  },
}))

const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL
const describeIfIntegration = integrationDatabaseUrl ? describe : describe.skip

describeIfIntegration("Auth integration", () => {
  let pool: Pool | undefined

  beforeAll(async () => {
    process.env.DATABASE_URL = integrationDatabaseUrl

    const schemaFilePath = path.resolve(__dirname, "../../../../db/schema.sql")
    const schemaSql = fs.readFileSync(schemaFilePath, "utf8")

    pool = new Pool({ connectionString: integrationDatabaseUrl })

    // Try to load schema, but ignore errors if tables/types already exist
    // (they may have been created by other integration test suites)
    try {
      await pool.query(schemaSql)
    } catch (error: unknown) {
      // Ignore "already exists" type errors - other test suites may have created the schema
      if (
        error instanceof Error &&
        (error.message.includes("already exists") || error.message.includes("duplicate key"))
      ) {
        // Ignore this error
      } else {
        throw error
      }
    }
  })

  beforeEach(async () => {
    if (!pool) {
      throw new Error("Integration pool was not initialized")
    }

    // Truncate all tables with CASCADE to handle foreign keys
    // Note: RESTART IDENTITY comes before CASCADE in PostgreSQL syntax
    await pool.query(
      "TRUNCATE TABLE rate_limit_events, links, auth_verification_tokens, accounts, sessions, user_credentials, users RESTART IDENTITY CASCADE",
    )
    vi.resetModules()
  })

  afterAll(async () => {
    if (pool) {
      await pool.end()
    }
  })

  describe("register → login flow", () => {
    it("registers a new user and then logs in successfully", async () => {
      const { POST: registerPOST } = await import("./register/route")

      // Register
      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const registerResponse = await registerPOST(registerRequest)
      const registerBody = await registerResponse.json()

      expect(registerResponse.status).toBe(201)
      expect(registerBody.ok).toBe(true)
      expect(registerBody.user.email).toBe("user@example.com")
      expect(registerBody.user.emailVerified).toBe(false)

      const userId = registerBody.user.id

      // Verify user was created in DB
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [userId])
      expect(userResult.rows).toHaveLength(1)
      expect(userResult.rows[0].email).toBe("user@example.com")

      // Mark user verified so login can proceed.
      await pool.query(`UPDATE users SET email_verified = TRUE WHERE id = $1`, [userId])

      // Now login with same credentials
      vi.resetModules()
      const { POST: loginPOST } = await import("./login/route")

      const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const loginResponse = await loginPOST(loginRequest)
      const loginBody = await loginResponse.json()

      expect(loginResponse.status).toBe(200)
      expect(loginBody.ok).toBe(true)
      expect(loginBody.user.id).toBe(userId)
      expect(loginBody.user.email).toBe("user@example.com")

      // Check that session was created
      const sessionResult = await pool.query("SELECT * FROM sessions WHERE user_id = $1", [userId])
      expect(sessionResult.rows).toHaveLength(1)
      const createdSession = sessionResult.rows[0]
      expect(createdSession.session_token).toBeTruthy()
      expect(createdSession.expires_at).toBeTruthy()

      // Check cookie was set
      const setCookie = loginResponse.headers.get("set-cookie")
      expect(setCookie).toMatch(/link_shortener_session=/)
      expect(setCookie).toMatch(/HttpOnly/i)
    })

    it("rejects login with wrong password", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      // Register user first
      const { POST: registerPOST } = await import("./register/route")

      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      await registerPOST(registerRequest)

      // Try to login with wrong password
      vi.resetModules()
      const { POST: loginPOST } = await import("./login/route")

      const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "WrongPassword456",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const loginResponse = await loginPOST(loginRequest)
      const loginBody = await loginResponse.json()

      expect(loginResponse.status).toBe(401)
      expect(loginBody.error).toBe("Invalid email or password")

      // Verify no session was created
      const sessionResult = await pool.query("SELECT * FROM sessions")
      expect(sessionResult.rows).toHaveLength(0)
    })

    it("blocks login until email is verified", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      const { POST: registerPOST } = await import("./register/route")

      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      await registerPOST(registerRequest)

      vi.resetModules()
      const { POST: loginPOST } = await import("./login/route")

      const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const loginResponse = await loginPOST(loginRequest)
      const loginBody = await loginResponse.json()

      expect(loginResponse.status).toBe(403)
      expect(loginBody.error).toBe("Please verify your email before logging in")
      expect(loginBody.code).toBe("EMAIL_NOT_VERIFIED")

      const sessionResult = await pool.query("SELECT * FROM sessions")
      expect(sessionResult.rows).toHaveLength(0)
    })

    it("rejects registration with weak password", async () => {
      const { POST: registerPOST } = await import("./register/route")

      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "weak",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const registerResponse = await registerPOST(registerRequest)
      const registerBody = await registerResponse.json()

      expect(registerResponse.status).toBe(400)
      expect(registerBody.error).toMatch(/at least 8 characters/)

      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      // Verify no user was created
      const userResult = await pool.query("SELECT * FROM users")
      expect(userResult.rows).toHaveLength(0)
    })

    it("rejects duplicate email registration", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      const { POST: registerPOST } = await import("./register/route")

      // Register first user
      let registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      let registerResponse = await registerPOST(registerRequest)
      expect(registerResponse.status).toBe(201)

      // Try to register with same email
      vi.resetModules()
      const { POST: registerPOST2 } = await import("./register/route")

      registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      registerResponse = await registerPOST2(registerRequest)
      const registerBody = await registerResponse.json()

      expect(registerResponse.status).toBe(409)
      expect(registerBody.error).toBe("Email is already registered")

      // Verify only one user exists
      const userResult = await pool.query("SELECT * FROM users")
      expect(userResult.rows).toHaveLength(1)
    })
  })

  describe("logout flow", () => {
    it("logs out a user and invalidates the session", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      // Register and login
      const { POST: registerPOST } = await import("./register/route")

      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      await registerPOST(registerRequest)

      await pool.query(`UPDATE users SET email_verified = TRUE WHERE email = $1`, ["user@example.com"])

      vi.resetModules()
      const { POST: loginPOST } = await import("./login/route")

      const loginRequest = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
      })

      const loginResponse = await loginPOST(loginRequest)
      const sessionCookie = loginResponse.headers.getSetCookie()[0]
      const tokenMatch = sessionCookie?.match(/link_shortener_session=([^;]+)/)
      const sessionToken = tokenMatch?.[1]

      expect(sessionToken).toBeTruthy()

      // Verify session exists
      let sessionResult = await pool.query("SELECT * FROM sessions")
      expect(sessionResult.rows).toHaveLength(1)

      // Now logout with the session cookie
      vi.resetModules()
      const { POST: logoutPOST } = await import("./logout/route")

      const logoutRequest = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: `link_shortener_session=${sessionToken}`,
        },
      })

      const logoutResponse = await logoutPOST(logoutRequest)
      const logoutBody = await logoutResponse.json()

      expect(logoutResponse.status).toBe(200)
      expect(logoutBody.ok).toBe(true)

      // Verify session was deleted
      sessionResult = await pool.query("SELECT * FROM sessions")
      expect(sessionResult.rows).toHaveLength(0)

      // Check cookie was cleared
      const setCookie = logoutResponse.headers.get("set-cookie")
      expect(setCookie).toMatch(/Max-Age=0/i)
    })
  })

  describe("rate limiting", () => {
    it("enforces rate limit on register endpoint", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      const { POST: registerPOST } = await import("./register/route")

      // Make 5 successful registrations (hits the limit of 5 per 60s)
      for (let i = 0; i < 5; i++) {
        const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: `user${i}@example.com`,
            password: "TestPassword123",
          }),
          headers: {
            "Content-Type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "192.168.1.1",
          },
        })

        const registerResponse = await registerPOST(registerRequest)
        expect(registerResponse.status).toBe(201)
      }

      // 6th request should be rate limited
      vi.resetModules()
      const { POST: registerPOST2 } = await import("./register/route")

      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user5@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "192.168.1.1",
        },
      })

      const registerResponse = await registerPOST2(registerRequest)
      const registerBody = await registerResponse.json()

      expect(registerResponse.status).toBe(429)
      expect(registerBody.error).toMatch(/Too many requests/)
      expect(registerResponse.headers.get("Retry-After")).toBe("60")
    })

    it("rate limit per IP address", async () => {
      if (!pool) {
        throw new Error("Integration pool was not initialized")
      }

      const { POST: registerPOST } = await import("./register/route")

      // Make 5 registrations from IP 1
      for (let i = 0; i < 5; i++) {
        const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            email: `user${i}@example.com`,
            password: "TestPassword123",
          }),
          headers: {
            "Content-Type": "application/json",
            origin: "http://localhost:3000",
            "x-forwarded-for": "192.168.1.1",
          },
        })

        await registerPOST(registerRequest)
      }

      // IP 2 should still be able to register (rate limit is per IP)
      const registerRequest = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "user10@example.com",
          password: "TestPassword123",
        }),
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
          "x-forwarded-for": "192.168.1.2",
        },
      })

      const registerResponse = await registerPOST(registerRequest)
      expect(registerResponse.status).toBe(201)
    })
  })
})
