import { beforeEach, describe, expect, it, vi } from "vitest"

const isResolveLinkRateLimitedMock = vi.fn()
const getActiveLinkByShortCodeMock = vi.fn()
const headersMock = vi.fn()
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND")
})
const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT")
})

vi.mock("next/headers", () => ({
  headers: headersMock,
}))

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}))

vi.mock("@/helpers/rateLimitHelpers", () => ({
  RESOLVE_LINK_RATE_LIMIT: {
    maxRequests: 120,
    windowSeconds: 60,
  },
  isResolveLinkRateLimited: isResolveLinkRateLimitedMock,
}))

vi.mock("@/helpers/shortLinkHelpers", () => ({
  getActiveLinkByShortCode: getActiveLinkByShortCodeMock,
}))

describe("GET /[shortCode]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isResolveLinkRateLimitedMock.mockResolvedValue(false)
    headersMock.mockResolvedValue(new Headers({ host: "localhost:3000" }))
  })

  it("calls notFound for invalid short code", async () => {
    const page = (await import("./page")).default

    await expect(page({ params: Promise.resolve({ shortCode: "abc" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    )
    expect(notFoundMock).toHaveBeenCalledOnce()
  })

  it("calls notFound when link not found", async () => {
    getActiveLinkByShortCodeMock.mockResolvedValueOnce(undefined)

    const page = (await import("./page")).default

    await expect(page({ params: Promise.resolve({ shortCode: "abcd" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    )
    expect(notFoundMock).toHaveBeenCalledOnce()
  })

  it("redirects when link exists", async () => {
    getActiveLinkByShortCodeMock.mockResolvedValueOnce({ original_url: "https://example.com" })

    const page = (await import("./page")).default

    await expect(page({ params: Promise.resolve({ shortCode: "abcd" }) })).rejects.toThrow(
      "NEXT_REDIRECT",
    )
    expect(redirectMock).toHaveBeenCalledWith("https://example.com")
  })
})
