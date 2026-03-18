import type { CreateShortLinkSuccessResponse } from "@/types/short-link"
import Cookies from "js-cookie"

export type ShortLinkHistoryEntry = {
  id: number
  shortCode: string
  shortUrl: string
  originalUrl: string
  expiresAt: string | null
}

const HISTORY_COOKIE_NAME = "shortLinkHistory"
const MAX_HISTORY_ITEMS = 10

export const getShortLinkHistory = () => {
  const historyJson = Cookies.get(HISTORY_COOKIE_NAME)

  if (!historyJson) {
    return [] as ShortLinkHistoryEntry[]
  }

  try {
    const parsed = JSON.parse(historyJson) as unknown

    if (!Array.isArray(parsed)) {
      return [] as ShortLinkHistoryEntry[]
    }

    const finalValue = parsed.filter((item): item is ShortLinkHistoryEntry => {
      if (
        !Boolean(item) ||
        typeof item !== "object" ||
        typeof (item as { id?: unknown }).id !== "string" ||
        typeof (item as { shortCode?: unknown }).shortCode !== "string" ||
        typeof (item as { shortUrl?: unknown }).shortUrl !== "string" ||
        typeof (item as { originalUrl?: unknown }).originalUrl !== "string"
      ) {
        return false
      }

      const expiresAt = (item as { expiresAt?: unknown }).expiresAt
      if (expiresAt !== null && expiresAt !== undefined) {
        if (typeof expiresAt !== "string" || new Date(expiresAt) <= new Date()) {
          return false
        }
      }

      return true
    })

    return finalValue
  } catch {
    return [] as ShortLinkHistoryEntry[]
  }
}

export const saveShortLinkToHistory = (link: CreateShortLinkSuccessResponse) => {
  const existing = getShortLinkHistory()

  const nextEntry: ShortLinkHistoryEntry = {
    id: link.id,
    shortCode: link.shortCode,
    shortUrl: link.shortUrl,
    originalUrl: link.originalUrl,
    expiresAt: link.expiresAt,
  }

  const deduped = existing.filter(
    (item) =>
      item.shortCode !== nextEntry.shortCode &&
      (item.expiresAt === null || new Date(item.expiresAt) > new Date()),
  )
  const nextHistory = [nextEntry, ...deduped].slice(0, MAX_HISTORY_ITEMS)

  Cookies.set(HISTORY_COOKIE_NAME, JSON.stringify(nextHistory), { expires: 30 })
}
