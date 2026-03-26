import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const queryMock = vi.fn()
const isLoginRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()
const createEmailVerificationTokenMock = vi.fn()
const buildVerificationUrlMock = vi.fn()
const sendEmailVerificationEmailMock = vi.fn()

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
  createEmailVerificationToken: createEmailVerificationTokenMock,
  buildVerificationUrl: buildVerificationUrlMock,
}))

vi.mock("@/lib/db", () => ({
  dbPool: {
    query: queryMock,
  },
}))

vi.mock("@/lib/transactionalEmail", () => ({
  sendEmailVerificationEmail: sendEmailVerificationEmailMock,
}))

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSameOriginRequestMock.mockReturnValue(true)
    isLoginRateLimitedMock.mockResolvedValue(false)
    createEmailVerificationTokenMock.mockResolvedValue("verification-token")
    buildVerificationUrlMock.mockReturnValue(
      "http://localhost:3000/api/auth/verify-email?token=verification-token",
    )
    sendEmailVerificationEmailMock.mockResolvedValue({ sent: true, skipped: false })
    queryMock.mockResolvedValue({ rows: [] })
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
    const request = new NextRequest("http://localhost:3000/api/auth/resend-verification", {
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

  it("returns generic success and sends email when user exists and is unverified", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "user-id-1", email: "user@example.com", email_verified: false }],
    })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(createEmailVerificationTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: queryMock }),
      {
        userId: "user-id-1",
        email: "user@example.com",
        ttlMinutes: 60 * 24,
      },
    )
    expect(buildVerificationUrlMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "verification-token",
    )
    expect(sendEmailVerificationEmailMock).toHaveBeenCalledWith({
      to: "user@example.com",
      verificationUrl: "http://localhost:3000/api/auth/verify-email?token=verification-token",
    })
  })

  it("returns generic success and does not send email when user does not exist", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "unknown@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(createEmailVerificationTokenMock).not.toHaveBeenCalled()
    expect(buildVerificationUrlMock).not.toHaveBeenCalled()
    expect(sendEmailVerificationEmailMock).not.toHaveBeenCalled()
  })

  it("returns generic success and does not send email when user is already verified", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: "user-id-1", email: "user@example.com", email_verified: true }],
    })

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(createEmailVerificationTokenMock).not.toHaveBeenCalled()
    expect(buildVerificationUrlMock).not.toHaveBeenCalled()
    expect(sendEmailVerificationEmailMock).not.toHaveBeenCalled()
  })
})
