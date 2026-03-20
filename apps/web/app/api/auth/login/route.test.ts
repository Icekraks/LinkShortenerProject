import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { randomBytes, scrypt as scryptCallback } from "node:crypto"
import { promisify } from "node:util"

const queryMock = vi.fn()
const releaseMock = vi.fn()
const connectMock = vi.fn()
const isLoginRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()

vi.mock("@lib/db", () => ({
  dbPool: {
    connect: connectMock,
  },
}))

vi.mock("@/helpers/rateLimitHelpers", () => ({
  LOGIN_RATE_LIMIT: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  isLoginRateLimited: isLoginRateLimitedMock,
}))

vi.mock("@/helpers/urlHelpers", () => ({
  isSameOriginRequest: isSameOriginRequestMock,
}))

const scryptAsync = promisify(scryptCallback)
const PASSWORD_HASH_KEY_LENGTH = 64

const hashPasswordForTest = async (password: string) => {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, PASSWORD_HASH_KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`
}

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/login", () => {
  let validPasswordHash: string

  beforeAll(async () => {
    validPasswordHash = await hashPasswordForTest("Password123")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock })
    isSameOriginRequestMock.mockReturnValue(true)
    isLoginRateLimitedMock.mockResolvedValue(false)
    queryMock.mockResolvedValue({ rows: [] })
  })

  it("returns 403 when request is cross-origin", async () => {
    isSameOriginRequestMock.mockReturnValue(false)

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limited", async () => {
    isLoginRateLimitedMock.mockResolvedValue(true)

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("Too many requests. Please try again shortly.")
    expect(response.headers.get("Retry-After")).toBe("60")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 400 when body is not valid JSON", async () => {
    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid JSON body")
  })

  it("returns 400 when email and password are missing", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Email and password are required")
  })

  it("returns 400 when email is invalid", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "not-an-email", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Please provide a valid email address")
  })

  it("returns 400 when password is empty", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Password is required")
  })

  it("returns 401 when user is not found", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({ email: "unknown@example.com", password: "Password123" }),
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Invalid email or password")
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("returns 401 when password is incorrect", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: "user-id-1",
          email: "user@example.com",
          email_verified: true,
          password_hash: validPasswordHash,
          password_algorithm: "scrypt",
        },
      ],
    })

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({ email: "user@example.com", password: "WrongPassword1" }),
    )
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Invalid email or password")
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("returns 200 with user payload and sets session cookie on success", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: "user-id-1",
            email: "user@example.com",
            email_verified: true,
            password_hash: validPasswordHash,
            password_algorithm: "scrypt",
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ id: "session-id-1" }] })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.user.id).toBe("user-id-1")
    expect(body.user.email).toBe("user@example.com")
    expect(body.user.emailVerified).toBe(true)
    expect(response.headers.get("set-cookie")).toMatch(/link_shortener_session=/)
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i)
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("normalizes email to lowercase before querying", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")
    await POST(makeRequest({ email: "  User@Example.COM  ", password: "Password123" }))

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE u.email"), [
      "user@example.com",
    ])
  })

  it("returns 500 on unexpected DB error", async () => {
    connectMock.mockRejectedValueOnce(new Error("DB connection failed"))

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Failed to login user")
  })
})
