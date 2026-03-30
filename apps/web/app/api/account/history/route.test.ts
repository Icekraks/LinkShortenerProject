import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const getActiveSessionMock = vi.fn()
const dbQueryMock = vi.fn()

vi.mock("@/lib/authSession", () => ({
  getActiveSession: getActiveSessionMock,
}))

vi.mock("@/lib/db", () => ({
  dbPool: {
    query: dbQueryMock,
  },
}))

describe("GET /api/account/history", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 and does not query history when user is not logged in", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: false, userId: null })

    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/history")

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      ok: false,
      error: "Unauthorized",
      history: [],
    })
    expect(dbQueryMock).not.toHaveBeenCalled()
  })

  it("returns mapped history when user is logged in", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })
    dbQueryMock.mockResolvedValue({
      rows: [
        {
          id: 123,
          short_code: "abcd",
          original_url: "https://example.com/page",
          created_at: new Date("2026-03-30T00:00:00.000Z"),
          expires_at: new Date("2026-03-31T00:00:00.000Z"),
        },
      ],
    })

    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/history")

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(dbQueryMock).toHaveBeenCalledTimes(1)
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1"), [
      "user-id-1",
    ])
    expect(body).toEqual({
      ok: true,
      history: [
        {
          id: "123",
          shortCode: "abcd",
          shortUrl: "http://localhost:3000/abcd",
          originalUrl: "https://example.com/page",
          createdAt: "2026-03-30T00:00:00.000Z",
          expiresAt: "2026-03-31T00:00:00.000Z",
        },
      ],
    })
  })
})
