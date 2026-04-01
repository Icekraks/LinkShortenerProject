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

describe("/api/account/permanent-links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET returns 401 and does not query when user is not logged in", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: false, userId: null })

    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links")

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

  it("GET returns only mapped permanent links when user is logged in", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })
    dbQueryMock.mockResolvedValue({
      rows: [
        {
          id: 123,
          short_code: "perm1",
          original_url: "https://example.com/permanent",
          created_at: new Date("2026-03-30T00:00:00.000Z"),
          expires_at: null,
        },
      ],
    })

    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links")

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(dbQueryMock).toHaveBeenCalledTimes(1)
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringContaining("AND expires_at IS NULL"), [
      "user-id-1",
    ])
    expect(body).toEqual({
      ok: true,
      history: [
        {
          id: "123",
          shortCode: "perm1",
          shortUrl: "http://localhost:3000/perm1",
          originalUrl: "https://example.com/permanent",
          createdAt: "2026-03-30T00:00:00.000Z",
          expiresAt: null,
        },
      ],
    })
  })

  it("DELETE returns 401 and does not query when user is not logged in", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: false, userId: null })

    const { DELETE } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links", {
      method: "DELETE",
      body: JSON.stringify({ id: 123 }),
      headers: {
        "content-type": "application/json",
      },
    })

    const response = await DELETE(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      ok: false,
      error: "Unauthorized",
    })
    expect(dbQueryMock).not.toHaveBeenCalled()
  })

  it("DELETE returns 400 when id is invalid", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })

    const { DELETE } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links", {
      method: "DELETE",
      body: JSON.stringify({ id: "abc" }),
      headers: {
        "content-type": "application/json",
      },
    })

    const response = await DELETE(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      ok: false,
      error: "A valid permanent link id is required",
    })
    expect(dbQueryMock).not.toHaveBeenCalled()
  })

  it("DELETE soft-deletes a permanent link for the logged-in user", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })
    dbQueryMock.mockResolvedValue({ rowCount: 1, rows: [{ id: 123 }] })

    const { DELETE } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links", {
      method: "DELETE",
      body: JSON.stringify({ id: 123 }),
      headers: {
        "content-type": "application/json",
      },
    })

    const response = await DELETE(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(dbQueryMock).toHaveBeenCalledTimes(1)
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringContaining("AND expires_at IS NULL"), [
      123,
      "user-id-1",
    ])
    expect(body).toEqual({
      ok: true,
      deletedId: "123",
    })
  })

  it("DELETE returns 404 when permanent link does not exist", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })
    dbQueryMock.mockResolvedValue({ rowCount: 0, rows: [] })

    const { DELETE } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/account/permanent-links", {
      method: "DELETE",
      body: JSON.stringify({ id: 999 }),
      headers: {
        "content-type": "application/json",
      },
    })

    const response = await DELETE(request)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({
      ok: false,
      error: "Permanent link not found",
    })
    expect(dbQueryMock).toHaveBeenCalledTimes(1)
  })
})
