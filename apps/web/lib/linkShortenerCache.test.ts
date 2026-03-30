import { describe, expect, it, vi } from "vitest"

import { syncAccountHistoryCacheAfterCreate } from "@/lib/linkShortenerCache"
import type { CreateShortLinkSuccessResponse } from "@/types/short-link"

const makeCreatedLink = (
  overrides: Partial<CreateShortLinkSuccessResponse> = {},
): CreateShortLinkSuccessResponse => ({
  id: 101,
  shortCode: "new1",
  shortUrl: "http://localhost:3000/new1",
  originalUrl: "https://example.com/new1",
  createdAt: "2026-03-30T12:00:00.000Z",
  expiryHours: 24,
  expiresAt: null,
  shortPath: "/new1",
  ...overrides,
})

describe("syncAccountHistoryCacheAfterCreate", () => {
  it("does not update query cache when session is not logged in", () => {
    const setQueryData = vi.fn()

    syncAccountHistoryCacheAfterCreate({
      queryClient: { setQueryData },
      createdLink: makeCreatedLink(),
      session: { isLoggedIn: false, userId: null },
    })

    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("updates account-history cache when session is logged in", () => {
    const setQueryData = vi.fn()

    syncAccountHistoryCacheAfterCreate({
      queryClient: { setQueryData },
      createdLink: makeCreatedLink(),
      session: { isLoggedIn: true, userId: "user-id-1" },
    })

    expect(setQueryData).toHaveBeenCalledTimes(1)

    const [, updater] = setQueryData.mock.calls[0] as [
      readonly string[],
      (
        current: Array<{
          id: string
          shortCode: string
          shortUrl: string
          originalUrl: string
          createdAt: string
          expiresAt: string | null
        }>,
      ) => Array<{
        id: string
        shortCode: string
        shortUrl: string
        originalUrl: string
        createdAt: string
        expiresAt: string | null
      }>,
    ]

    const updated = updater([
      {
        id: "100",
        shortCode: "old1",
        shortUrl: "http://localhost:3000/old1",
        originalUrl: "https://example.com/old1",
        createdAt: "2026-03-29T12:00:00.000Z",
        expiresAt: null,
      },
    ])

    expect(updated[0]).toEqual({
      id: "101",
      shortCode: "new1",
      shortUrl: "http://localhost:3000/new1",
      originalUrl: "https://example.com/new1",
      createdAt: "2026-03-30T12:00:00.000Z",
      expiresAt: null,
    })
    expect(updated).toHaveLength(2)
  })

  it("replaces existing item with same shortCode via updater dedupe", () => {
    const setQueryData = vi.fn()

    syncAccountHistoryCacheAfterCreate({
      queryClient: { setQueryData },
      createdLink: makeCreatedLink({
        id: 200,
        shortCode: "same",
        shortUrl: "http://localhost:3000/same",
      }),
      session: { isLoggedIn: true, userId: "user-id-1" },
    })

    const [, updater] = setQueryData.mock.calls[0] as [
      readonly string[],
      (
        current: Array<{
          id: string
          shortCode: string
          shortUrl: string
          originalUrl: string
          createdAt: string
          expiresAt: string | null
        }>,
      ) => Array<{
        id: string
        shortCode: string
        shortUrl: string
        originalUrl: string
        createdAt: string
        expiresAt: string | null
      }>,
    ]

    const updated = updater([
      {
        id: "111",
        shortCode: "same",
        shortUrl: "http://localhost:3000/same",
        originalUrl: "https://example.com/old",
        createdAt: "2026-03-20T00:00:00.000Z",
        expiresAt: null,
      },
    ])

    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe("200")
    expect(updated[0].originalUrl).toBe("https://example.com/new1")
  })
})
