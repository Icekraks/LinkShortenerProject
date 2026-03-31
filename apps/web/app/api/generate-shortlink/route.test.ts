import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const queryMock = vi.fn()
const releaseMock = vi.fn()
const connectMock = vi.fn()

const isCreateLinkRateLimitedMock = vi.fn()
const isSameOriginRequestMock = vi.fn()
const isSelfDomainTargetMock = vi.fn()
const encodeLinkIdToShortCodeMock = vi.fn()
const qrCodeToDataURLMock = vi.fn()
const getActiveSessionMock = vi.fn()

vi.mock("@lib/db", () => ({
  dbPool: {
    connect: connectMock,
  },
}))

vi.mock("@/helpers/rateLimitHelpers", () => ({
  CREATE_LINK_RATE_LIMIT: {
    maxRequests: 10,
    windowSeconds: 60,
  },
  isCreateLinkRateLimited: isCreateLinkRateLimitedMock,
}))

vi.mock("@/helpers/urlHelpers", () => ({
  isSameOriginRequest: isSameOriginRequestMock,
  isSelfDomainTarget: isSelfDomainTargetMock,
}))

vi.mock("@/lib/authSession", () => ({
  getActiveSession: getActiveSessionMock,
}))

vi.mock("@lib/shortCode", () => ({
  encodeLinkIdToShortCode: encodeLinkIdToShortCodeMock,
}))

vi.mock("qrcode", () => ({
  default: {
    toDataURL: qrCodeToDataURLMock,
  },
}))

vi.mock("@/sql/generateShortLink", () => ({
  ALLOCATE_NEXT_LINK_ID_QUERY: "SELECT nextval(pg_get_serial_sequence('links', 'id')) AS id",
  INSERT_SHORT_LINK_WITH_CODE_QUERY:
    "INSERT INTO links (id, short_code, original_url, expires_at) VALUES ($1, $2, $3, $4)",
}))

describe("POST /api/generate-shortlink", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    connectMock.mockResolvedValue({
      query: queryMock,
      release: releaseMock,
    })

    isCreateLinkRateLimitedMock.mockResolvedValue(false)
    isSameOriginRequestMock.mockReturnValue(true)
    isSelfDomainTargetMock.mockReturnValue(false)
    encodeLinkIdToShortCodeMock.mockReturnValue("abcd")
    qrCodeToDataURLMock.mockResolvedValue("data:image/png;base64,qr")
    getActiveSessionMock.mockResolvedValue({
      isLoggedIn: false,
      userId: null,
    })
  })

  it("returns 429 when rate limited", async () => {
    isCreateLinkRateLimitedMock.mockResolvedValue(true)

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(429)
    expect(body.error).toBe("Too many requests. Please try again shortly.")
  })

  it("returns 400 when target URL is same domain", async () => {
    isSelfDomainTargetMock.mockReturnValue(true)

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "http://localhost:3000/some-path",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Cannot shorten URLs from this domain")
  })

  it("returns 400 when custom short code is blacklisted", async () => {
    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
        customShortCode: "admin",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("This custom short code is reserved. Please choose a different one.")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("creates a short link and returns 201", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "123" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 123,
            short_code: "abcd",
            original_url: "https://example.com/",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            expires_at: new Date("2026-01-02T00:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.shortCode).toBe("abcd")
    expect(body.shortUrl).toBe("http://localhost:3000/abcd")
    expect(body.createdAt).toBe("2026-01-01T00:00:00.000Z")
    expect(body.expiresAt).toBe("2026-01-02T00:00:00.000Z")
    expect(body.qrCodeDataUrl).toBe("data:image/png;base64,qr")
    expect(releaseMock).toHaveBeenCalledTimes(1)
    expect(queryMock).toHaveBeenCalledWith("BEGIN")
    expect(queryMock).toHaveBeenCalledWith(
      "INSERT INTO links (id, short_code, original_url, expires_at) VALUES ($1, $2, $3, $4)",
      [123, "abcd", "https://example.com/", expect.any(Date), null],
    )
    expect(queryMock).toHaveBeenCalledWith("COMMIT")
  })

  it("passes authenticated user id when session is active", async () => {
    getActiveSessionMock.mockResolvedValue({
      isLoggedIn: true,
      userId: "user_123",
    })

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "123" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 123,
            short_code: "abcd",
            original_url: "https://example.com/",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            expires_at: new Date("2026-01-02T00:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(queryMock).toHaveBeenCalledWith(
      "INSERT INTO links (id, short_code, original_url, expires_at) VALUES ($1, $2, $3, $4)",
      [123, "abcd", "https://example.com/", expect.any(Date), "user_123"],
    )
  })

  it("returns 409 when custom short code already exists", async () => {
    const duplicateShortCodeError = {
      code: "23505",
      constraint: "links_short_code_unique",
    }

    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "123" }] })
      .mockRejectedValueOnce(duplicateShortCodeError)
      .mockResolvedValueOnce({ rows: [] })

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
        customShortCode: "abcd",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Short code already exists")
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })

  it("returns 403 when request is cross-origin", async () => {
    isSameOriginRequestMock.mockReturnValue(false)

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({ originalUrl: "https://example.com", expiryHours: 24 }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 400 when originalUrl is missing", async () => {
    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({ expiryHours: 24 }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Valid URL is required")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 400 when originalUrl is not a valid URL", async () => {
    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({ originalUrl: "not-a-url", expiryHours: 24 }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("Invalid URL")
  })

  it("returns 400 when customShortCode has invalid format", async () => {
    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
        customShortCode: "ab!",
      }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/at least 4 characters/)
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 400 when expiryHours is not an allowed value", async () => {
    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({ originalUrl: "https://example.com", expiryHours: 2 }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe("expiryHours must be one of: 1, 4, 6, 12, 24")
    expect(connectMock).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected DB error", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: "123" }] }) // ALLOCATE_NEXT_LINK_ID
      .mockRejectedValueOnce(new Error("unexpected db error")) // INSERT
      .mockResolvedValueOnce({ rows: [] }) // ROLLBACK

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({ originalUrl: "https://example.com", expiryHours: 24 }),
      headers: { "Content-Type": "application/json" },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe("Failed to create short link")
    expect(queryMock).toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })

  it("returns 201 without qrCodeDataUrl when QR code generation fails", async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: "123" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 123,
            short_code: "abcd",
            original_url: "https://example.com/",
            created_at: new Date("2026-01-01T00:00:00.000Z"),
            expires_at: new Date("2026-01-02T00:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    qrCodeToDataURLMock.mockRejectedValueOnce(new Error("QR generation failed"))

    const { POST } = await import("./route")

    const request = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.shortCode).toBe("abcd")
    expect(body.shortUrl).toBe("http://localhost:3000/abcd")
    expect(body.qrCodeDataUrl).toBeUndefined()
    expect(queryMock).toHaveBeenCalledWith("BEGIN")
    expect(queryMock).toHaveBeenCalledWith("COMMIT")
    expect(queryMock).not.toHaveBeenCalledWith("ROLLBACK")
    expect(releaseMock).toHaveBeenCalledTimes(1)
  })
})
