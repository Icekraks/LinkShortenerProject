import { beforeEach, describe, expect, it, vi } from "vitest"

const { getItemMock, setItemMock } = vi.hoisted(() => ({
  getItemMock: vi.fn(),
  setItemMock: vi.fn(),
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

const makeLink = (
  overrides: Partial<CreateShortLinkSuccessResponse> = {},
): CreateShortLinkSuccessResponse => ({
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
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: getItemMock,
        setItem: setItemMock,
      },
      configurable: true,
      writable: true,
    })
  })

  it("returns empty array when no storage value exists", () => {
    getItemMock.mockReturnValue(null)
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns empty array for invalid JSON", () => {
    getItemMock.mockReturnValue("not-json{{{")
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns empty array when stored value is not an array", () => {
    getItemMock.mockReturnValue(JSON.stringify({ id: "1" }))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out items missing required fields", () => {
    getItemMock.mockReturnValue(JSON.stringify([{ id: "1", shortCode: "abcd" }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out items with non-string id", () => {
    getItemMock.mockReturnValue(JSON.stringify([{ ...validEntry, id: 1 }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("returns valid entries with null expiresAt", () => {
    getItemMock.mockReturnValue(JSON.stringify([validEntry]))
    expect(getShortLinkHistory()).toEqual([validEntry])
  })

  it("returns valid entries with a future expiresAt", () => {
    const entry = { ...validEntry, expiresAt: FUTURE }
    getItemMock.mockReturnValue(JSON.stringify([entry]))
    expect(getShortLinkHistory()).toEqual([entry])
  })

  it("filters out expired entries", () => {
    getItemMock.mockReturnValue(JSON.stringify([{ ...validEntry, expiresAt: PAST }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out entries with non-string expiresAt that is not null", () => {
    getItemMock.mockReturnValue(JSON.stringify([{ ...validEntry, expiresAt: 12345 }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out entries with invalid expiresAt string", () => {
    getItemMock.mockReturnValue(JSON.stringify([{ ...validEntry, expiresAt: "not-a-date" }]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("filters out entries with missing expiresAt", () => {
    const entryWithoutExpiresAt = {
      id: "1",
      shortCode: "abcd",
      shortUrl: "http://localhost:3000/abcd",
      originalUrl: "https://example.com",
    }

    getItemMock.mockReturnValue(JSON.stringify([entryWithoutExpiresAt]))
    expect(getShortLinkHistory()).toEqual([])
  })

  it("keeps valid entries and discards invalid ones in the same array", () => {
    const entries = [
      validEntry,
      {
        id: "2",
        shortCode: "efgh",
        shortUrl: "http://localhost:3000/efgh",
        originalUrl: "https://b.com",
        expiresAt: PAST,
      },
      { shortCode: "bad" },
    ]
    getItemMock.mockReturnValue(JSON.stringify(entries))
    expect(getShortLinkHistory()).toEqual([validEntry])
  })
})

describe("saveShortLinkToHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: getItemMock,
        setItem: setItemMock,
      },
      configurable: true,
      writable: true,
    })
  })

  it("saves a new entry when history is empty", () => {
    getItemMock.mockReturnValue(null)
    saveShortLinkToHistory(makeLink())

    expect(setItemMock).toHaveBeenCalledWith("shortLinkHistory", JSON.stringify([validEntry]))
  })

  it("prepends new entry before existing ones", () => {
    const existing = {
      ...validEntry,
      id: "2",
      shortCode: "efgh",
      shortUrl: "http://localhost:3000/efgh",
    }
    getItemMock.mockReturnValue(JSON.stringify([existing]))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setItemMock.mock.calls[0][1])
    expect(saved[0].shortCode).toBe("abcd")
    expect(saved[1].shortCode).toBe("efgh")
  })

  it("deduplicates by shortCode, keeping the incoming entry", () => {
    const old = { ...validEntry, originalUrl: "https://old.com" }
    getItemMock.mockReturnValue(JSON.stringify([old]))

    saveShortLinkToHistory(makeLink({ originalUrl: "https://new.com" }))

    const saved = JSON.parse(setItemMock.mock.calls[0][1])
    expect(saved).toHaveLength(1)
    expect(saved[0].originalUrl).toBe("https://new.com")
  })

  it("removes expired entries when saving", () => {
    const expired = {
      id: "2",
      shortCode: "efgh",
      shortUrl: "http://localhost:3000/efgh",
      originalUrl: "https://example.com",
      expiresAt: PAST,
    }
    getItemMock.mockReturnValue(JSON.stringify([expired]))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setItemMock.mock.calls[0][1])
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
    getItemMock.mockReturnValue(JSON.stringify(existing))

    saveShortLinkToHistory(makeLink())

    const saved = JSON.parse(setItemMock.mock.calls[0][1])
    expect(saved).toHaveLength(10)
    expect(saved[0].shortCode).toBe("abcd")
  })
})
