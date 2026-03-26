import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const queryMock = vi.fn()
const isLoginRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()
const createPasswordResetTokenMock = vi.fn()
const sendPasswordResetEmailMock = vi.fn()

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

vi.mock("@/lib/authVerification", () => ({
  createPasswordResetToken: createPasswordResetTokenMock,
}))

vi.mock("@/lib/db", () => ({
  dbPool: {
    query: queryMock,
  },
}))

vi.mock("@/lib/transactionalEmail", () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock,
}))

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSameOriginRequestMock.mockReturnValue(true)
    isLoginRateLimitedMock.mockResolvedValue(false)
    queryMock.mockResolvedValue({ rows: [] })
    createPasswordResetTokenMock.mockResolvedValue("password-reset-token")
    sendPasswordResetEmailMock.mockResolvedValue({ sent: true, skipped: false })
  })

  it("returns 403 when request is cross-origin", async () => {
    isSameOriginRequestMock.mockReturnValue(false)

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limited", async () => {
    isLoginRateLimitedMock.mockResolvedValue(true)

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("Too many requests. Please try again shortly.")
    expect(response.headers.get("Retry-After")).toBe("60")
    expect(queryMock).not.toHaveBeenCalled()
  })

  it("returns 400 when body is not valid JSON", async () => {
    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid JSON body")
  })

  it("returns 400 when email is missing", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Email is required")
  })

  it("returns 400 when email is invalid", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "not-an-email" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Please provide a valid email address")
  })

  it("returns generic success and sends reset email when user exists", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "user-id-1", email: "user@example.com" }],
    })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(createPasswordResetTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: queryMock }),
      {
        userId: "user-id-1",
        email: "user@example.com",
        ttlMinutes: 60,
      },
    )
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith({
      to: "user@example.com",
      resetUrl: "http://localhost:3000/account/reset-password?token=password-reset-token",
    })
  })

  it("returns the same generic success and does not send email when user does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "unknown@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(createPasswordResetTokenMock).not.toHaveBeenCalled()
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled()
  })
})
