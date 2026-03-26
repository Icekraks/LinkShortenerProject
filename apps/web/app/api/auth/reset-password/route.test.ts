import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const queryMock = vi.fn()
const releaseMock = vi.fn()
const connectMock = vi.fn()
const isLoginRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()

vi.mock("@/lib/db", () => ({
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

const makeRequest = (body: unknown, token = "reset-token") =>
  new NextRequest(`http://localhost:3000/api/auth/reset-password?token=${token}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/reset-password", () => {
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
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "Password123",
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limited", async () => {
    isLoginRateLimitedMock.mockResolvedValue(true)

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "Password123",
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("Too many requests. Please try again shortly.")
    expect(response.headers.get("Retry-After")).toBe("60")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 400 when body is not valid JSON", async () => {
    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/auth/reset-password", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid JSON body")
  })

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Email and password are required")
  })

  it("returns 400 when email is invalid", async () => {
    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({
        email: "not-an-email",
        password: "Password123",
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Please provide a valid email address")
  })

  it("returns 400 when token is missing from query", async () => {
    const { POST } = await import("./route")
    const response = await POST(
      new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "Password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Token is required")
  })

  it("returns 400 when reset token is invalid or expired", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT token
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "Password123",
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid or expired reset token")
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("returns 200 and resets password when token is valid", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: "token-id-1", user_id: "user-id-1", email: "user@example.com" }],
      }) // SELECT token
      .mockResolvedValueOnce({ rows: [] }) // UPSERT password
      .mockResolvedValueOnce({ rows: [] }) // UPDATE token consumed_at
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({
        email: "user@example.com",
        password: "Password123",
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(queryMock).toHaveBeenCalledWith("BEGIN")
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("FROM auth_verification_tokens"),
      expect.any(Array),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO user_credentials"),
      expect.any(Array),
    )
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE auth_verification_tokens"),
      ["token-id-1"],
    )
    expect(queryMock).toHaveBeenCalledWith("COMMIT")
    expect(releaseMock).toHaveBeenCalledOnce()
  })
})
