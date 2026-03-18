import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCookieMock, setCookieMock } = vi.hoisted(() => ({
  getCookieMock: vi.fn(),
  setCookieMock: vi.fn(),
}))

vi.mock("js-cookie", () => ({
  default: {
    get: getCookieMock,
    set: setCookieMock,
  },
}))

import { getShortLinkHistory, saveShortLinkToHistory } from "./shortLinkHistory"
import type { CreateShortLinkSuccessResponse } from "@/types/short-link"

const FUTURE = "2099-01-01T00:00:00.000Z"
const PAST = "2020-01-01T00:00:00.000Z"

const validEntry = {
  id: "1",
  shortCode: "abcd",
  shortUrl: "http://localhost:3000/abcd",
  originalUrl: "https://example.com",
  expiresAt: null,
}

const makeLink = (overrides: Partial<CreateShortLinkSuccessResponse> = {}): CreateShortLinkSuccessResponse => ({
  id: 1,
  shortCode: "abcd",
  shortUrl: "http://localhost:3000/abcd",
  originalUrl: "https://example.com",
  createdAt: "2026-01-01T00:00:00.000Z",
  expiryHours: 24,
  expiresAt: null,
  shortPath: "/abcd",
  ...overrides,
})

describe("getShortLinkHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty array when no cookie exists", () => {
    getCookieMock.mockReturnValue(undefined)
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns empty array for invalid JSON", () => {
    getCookieMock.mockReturnValue("not-json{{{")
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns empty array when stored value is not an array", () => {
    getCookieMock.mockReturnValue(JSON.stringify({ id: "1" }))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out items missing required fields", () => {
    getCookieMock.mockReturnValue(JSON.stringify([{ id: "1", shortCode: "abcd" }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out items with non-string id", () => {
    getCookieMock.mockReturnValue(
      JSON.stringify([{ ...validEntry, id: 1 }]),
    )
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns valid entries with null expiresAt", () => {
    getCookieMock.mockReturnValue(JSON.stringify([validEntry]))
    expect(getShortLinkHistory()).toEqual([validEntry])
  })

  it("returns valid entries with a future expiresAt", () => {
    const entry = { ...validEntry, expiresAt: FUTURE }
    getCookieMock.mockReturnValue(JSON.stringify([entry]))
    expect(getShortLinkHistory()).toEqual([entry])
  })

  it("filters out expired entries", () => {
    getCookieMock.mockReturnValue(JSON.stringify([{ ...validEntry, expiresAt: PAST }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out entries with non-string expiresAt that is not null", () => {
    getCookieMock.mockReturnValue(JSON.stringify([{ ...validEntry, expiresAt: 12345 }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("keeps valid entries and discards invalid ones in the same array", () => {
    const entries = [
      validEntry,
      { id: "2", shortCode: "efgh", shortUrl: "http://localhost:3000/efgh", originalUrl: "https://b.com", expiresAt: PAST },
      { shortCode: "bad" },
    ]
    getCookieMock.mockReturnValue(JSON.stringify(entries))
    expect(getShortLinkHistory()).toEqual([validEntry])
  })
})

describe("saveShortLinkToHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("saves a new entry when history is empty", () => {
    getCookieMock.mockReturnValue(undefined)
    saveShortLinkToHistory(makeLink())

    expect(setCookieMock).toHaveBeenCalledWith(
      "shortLinkHistory",
      JSON.stringify([validEntry]),
      { expires: 30 },
    )
  })

  it("prepends new entry before existing ones", () => {
    const existing = { ...validEntry, id: "2", shortCode: "efgh", shortUrl: "http://localhost:3000/efgh" }
    getCookieMock.mockReturnValue(JSON.stringify([existing]))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setCookieMock.mock.calls[0][1])
    expect(saved[0].shortCode).toBe("abcd")
    expect(saved[1].shortCode).toBe("efgh")
  })

  it("deduplicates by shortCode, keeping the incoming entry", () => {
    const old = { ...validEntry, originalUrl: "https://old.com" }
    getCookieMock.mockReturnValue(JSON.stringify([old]))

    saveShortLinkToHistory(makeLink({ originalUrl: "https://new.com" }))

    const saved = JSON.parse(setCookieMock.mock.calls[0][1])
    expect(saved).toHaveLength(1)
    expect(saved[0].originalUrl).toBe("https://new.com")
  })

  it("removes expired entries when saving", () => {
    const expired = { id: "2", shortCode: "efgh", shortUrl: "http://localhost:3000/efgh", originalUrl: "https://example.com", expiresAt: PAST }
    getCookieMock.mockReturnValue(JSON.stringify([expired]))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setCookieMock.mock.calls[0][1])
    expect(saved).toHaveLength(1)
    expect(saved[0].shortCode).toBe("abcd")
  })

  it("caps history at 10 items", () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 2),
      shortCode: `code${i}`,
      shortUrl: `http://localhost:3000/code${i}`,
      originalUrl: "https://example.com",
      expiresAt: null,
    }))
    getCookieMock.mockReturnValue(JSON.stringify(existing))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setCookieMock.mock.calls[0][1])
    expect(saved).toHaveLength(10)
    expect(saved[0].shortCode).toBe("abcd")
  })
})
