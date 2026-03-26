import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const queryMock = vi.fn()
const releaseMock = vi.fn()
const connectMock = vi.fn()
const isRegisterRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()
const createEmailVerificationTokenMock = vi.fn()
const buildVerificationUrlMock = vi.fn()
const sendEmailVerificationEmailMock = vi.fn()

vi.mock("@lib/db", () => ({
  dbPool: {
    connect: connectMock,
  },
}))

vi.mock("@/helpers/rateLimitHelpers", () => ({
  REGISTER_RATE_LIMIT: {
    maxRequests: 5,
    windowSeconds: 60,
  },
  isRegisterRateLimited: isRegisterRateLimitedMock,
}))

vi.mock("@/helpers/urlHelpers", () => ({
  isSameOriginRequest: isSameOriginRequestMock,
}))

vi.mock("@/lib/authVerification", () => ({
  createEmailVerificationToken: createEmailVerificationTokenMock,
  buildVerificationUrl: buildVerificationUrlMock,
}))

vi.mock("@/lib/transactionalEmail", () => ({
  sendEmailVerificationEmail: sendEmailVerificationEmailMock,
}))

const makeRequest = (body: unknown) =>
  new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connectMock.mockResolvedValue({ query: queryMock, release: releaseMock })
    isSameOriginRequestMock.mockReturnValue(true)
    isRegisterRateLimitedMock.mockResolvedValue(false)
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
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limited", async () => {
    isRegisterRateLimitedMock.mockResolvedValue(true)

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
    const request = new NextRequest("http://localhost:3000/api/auth/register", {
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

  it("returns 400 when password is too short", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Sh0rt" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/at least 8 characters/)
  })

  it("returns 400 when password has no uppercase letter", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "password123" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/uppercase/)
  })

  it("returns 400 when password has no number", async () => {
    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({ email: "user@example.com", password: "PasswordOnly" }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/number/)
  })

  it("returns 201 with user payload on successful registration", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: "new-user-id", email: "user@example.com", email_verified: false }],
      }) // INSERT users
      .mockResolvedValueOnce({ rows: [] }) // INSERT user_credentials
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(body.user.id).toBe("new-user-id")
    expect(body.user.email).toBe("user@example.com")
    expect(body.user.emailVerified).toBe(false)
    expect(body.verificationEmailSent).toBe(true)
    expect(queryMock).toHaveBeenCalledWith("BEGIN")
    expect(queryMock).toHaveBeenCalledWith("COMMIT")
    expect(createEmailVerificationTokenMock).toHaveBeenCalledOnce()
    expect(sendEmailVerificationEmailMock).toHaveBeenCalledOnce()
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("normalizes email to lowercase before inserting", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: "new-user-id", email: "user@example.com", email_verified: false }],
      }) // INSERT users
      .mockResolvedValueOnce({ rows: [] }) // INSERT user_credentials
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const { POST } = await import("./route")
    await POST(makeRequest({ email: "  User@Example.COM  ", password: "Password123" }))

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO users"), [
      "user@example.com",
    ])
  })

  it("returns 409 when email is already registered", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce({ code: "23505", constraint: "users_email_key" }) // INSERT users

    const { POST } = await import("./route")
    const response = await POST(
      makeRequest({ email: "existing@example.com", password: "Password123" }),
    )
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Email is already registered")
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledOnce()
  })

  it("rolls back transaction and returns 500 on unexpected DB error", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error("unexpected DB error")) // INSERT users

    const { POST } = await import("./route")
    const response = await POST(makeRequest({ email: "user@example.com", password: "Password123" }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Failed to register user")
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledOnce()
  })
})
