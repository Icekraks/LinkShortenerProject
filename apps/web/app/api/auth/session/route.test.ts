import { beforeEach, describe, expect, it, vi } from "vitest"

const getActiveSessionMock = vi.fn()

vi.mock("@/lib/authSession", () => ({
  getActiveSession: getActiveSessionMock,
}))

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns isLoggedIn=true when a valid session exists", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: "user-id-1" })

    const { GET } = await import("./route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, isLoggedIn: true, userId: "user-id-1" })
  })

  it("returns isLoggedIn=false when no active session exists", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: false, userId: null })

    const { GET } = await import("./route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, isLoggedIn: false, userId: null })
  })

  it("returns isLoggedIn=false when session check throws", async () => {
    getActiveSessionMock.mockRejectedValue(new Error("session lookup failed"))

    const { GET } = await import("./route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      ok: false,
      error: "Failed to retrieve session",
      isLoggedIn: false,
      userId: null,
    })
  })

  it("returns userId=null when session is active but token payload cannot be decoded", async () => {
    getActiveSessionMock.mockResolvedValue({ isLoggedIn: true, userId: null })

    const { GET } = await import("./route")
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, isLoggedIn: true, userId: null })
  })
})
