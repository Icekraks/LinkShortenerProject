import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const isSameOriginRequestMock = vi.fn()

vi.mock("@/helpers/urlHelpers", () => ({
  isSameOriginRequest: isSameOriginRequestMock,
}))

const makeRequest = (cookies?: Record<string, string>) => {
  const headers: Record<string, string> = {}

  if (cookies) {
    headers["Cookie"] = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")
  }

  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers,
  })
}

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSameOriginRequestMock.mockReturnValue(true)
  })

  it("returns 403 when request is cross-origin", async () => {
    isSameOriginRequestMock.mockReturnValue(false)

    const { POST } = await import("./route")
    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe("Forbidden")
  })

  it("clears cookie when session token is present", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest({ link_shortener_session: "abc123token" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(response.headers.get("set-cookie")).toMatch(/link_shortener_session=/)
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i)
  })

  it("returns 200 and clears cookie even when no session cookie is present", async () => {
    const { POST } = await import("./route")
    const response = await POST(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(response.headers.get("set-cookie")).toMatch(/link_shortener_session=/)
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i)
  })

  it("returns 200 when called repeatedly", async () => {
    const { POST } = await import("./route")
    const firstResponse = await POST(makeRequest({ link_shortener_session: "abc123token" }))
    const secondResponse = await POST(makeRequest())

    expect(firstResponse.status).toBe(200)
    expect(secondResponse.status).toBe(200)
  })
})
