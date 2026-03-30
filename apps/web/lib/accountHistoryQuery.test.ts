import { describe, expect, it } from "vitest"

import {
  mapShortLinkToAccountHistoryItem,
  prependAndDedupeAccountHistory,
  type AccountHistoryItem,
} from "@/lib/accountHistoryQuery"
import type { CreateShortLinkSuccessResponse } from "@/types/short-link"

const makeCreatedLink = (
  overrides: Partial<CreateShortLinkSuccessResponse> = {},
): CreateShortLinkSuccessResponse => ({
  id: 123,
  shortCode: "abcd",
  shortUrl: "http://localhost:3000/abcd",
  originalUrl: "https://example.com",
  createdAt: "2026-03-30T00:00:00.000Z",
  expiryHours: 24,
  expiresAt: null,
  shortPath: "/abcd",
  ...overrides,
})

const makeHistoryItem = (overrides: Partial<AccountHistoryItem> = {}): AccountHistoryItem => ({
  id: "1",
  shortCode: "code-1",
  shortUrl: "http://localhost:3000/code-1",
  originalUrl: "https://example.com/1",
  createdAt: "2026-03-30T00:00:00.000Z",
  expiresAt: null,
  ...overrides,
})

describe("mapShortLinkToAccountHistoryItem", () => {
  it("maps a create-short-link response to account history item shape", () => {
    const mapped = mapShortLinkToAccountHistoryItem(
      makeCreatedLink({
        id: 99,
        shortCode: "xyz9",
        shortUrl: "http://localhost:3000/xyz9",
        originalUrl: "https://example.com/xyz9",
        createdAt: "2026-03-30T12:00:00.000Z",
        expiresAt: "2026-03-31T12:00:00.000Z",
      }),
    )

    expect(mapped).toEqual({
      id: "99",
      shortCode: "xyz9",
      shortUrl: "http://localhost:3000/xyz9",
      originalUrl: "https://example.com/xyz9",
      createdAt: "2026-03-30T12:00:00.000Z",
      expiresAt: "2026-03-31T12:00:00.000Z",
    })
  })
})

describe("prependAndDedupeAccountHistory", () => {
  it("prepends newest item to front", () => {
    const current = [
      makeHistoryItem({ id: "2", shortCode: "old-1" }),
      makeHistoryItem({ id: "3", shortCode: "old-2" }),
    ]
    const nextItem = makeHistoryItem({ id: "1", shortCode: "newest" })

    const result = prependAndDedupeAccountHistory(current, nextItem)

    expect(result[0]).toEqual(nextItem)
    expect(result).toHaveLength(3)
  })

  it("deduplicates when existing item has same id", () => {
    const current = [
      makeHistoryItem({ id: "10", shortCode: "same-id-old" }),
      makeHistoryItem({ id: "11", shortCode: "another" }),
    ]
    const nextItem = makeHistoryItem({ id: "10", shortCode: "same-id-new" })

    const result = prependAndDedupeAccountHistory(current, nextItem)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(nextItem)
    expect(result.some((item) => item.shortCode === "same-id-old")).toBe(false)
  })

  it("deduplicates when existing item has same shortCode", () => {
    const current = [
      makeHistoryItem({ id: "20", shortCode: "same-code" }),
      makeHistoryItem({ id: "21", shortCode: "another" }),
    ]
    const nextItem = makeHistoryItem({ id: "99", shortCode: "same-code" })

    const result = prependAndDedupeAccountHistory(current, nextItem)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(nextItem)
    expect(result.find((item) => item.id === "20")).toBeUndefined()
  })

  it("caps output to 100 items", () => {
    const current = Array.from({ length: 100 }, (_, index) =>
      makeHistoryItem({
        id: String(index + 1),
        shortCode: `code-${index + 1}`,
        shortUrl: `http://localhost:3000/code-${index + 1}`,
      }),
    )
    const nextItem = makeHistoryItem({
      id: "101",
      shortCode: "code-101",
      shortUrl: "http://localhost:3000/code-101",
    })

    const result = prependAndDedupeAccountHistory(current, nextItem)

    expect(result).toHaveLength(100)
    expect(result[0]).toEqual(nextItem)
    expect(result.find((item) => item.id === "99")).toBeDefined()
    expect(result.find((item) => item.id === "100")).toBeUndefined()
  })
})
