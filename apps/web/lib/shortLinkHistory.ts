import type { CreateShortLinkSuccessResponse } from "@/types/short-link"

export type ShortLinkHistoryEntry = {
  id: string
  shortCode: string
  shortUrl: string
  originalUrl: string
  expiresAt: string | null
}

const HISTORY_STORAGE_KEY = "shortLinkHistory"
const MAX_HISTORY_ITEMS = 10
export const SHORT_LINK_HISTORY_UPDATED_EVENT = "short-link-history-updated"

const getStorage = () => {
  try {
    if (typeof globalThis === "undefined" || !globalThis.localStorage) {
      return null
    }

    return globalThis.localStorage
  } catch {
    return null
  }
}

export const getShortLinkHistory = () => {
  const storage = getStorage()
  const historyJson = storage?.getItem(HISTORY_STORAGE_KEY)

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

      if (!Object.prototype.hasOwnProperty.call(item, "expiresAt")) {
        return false
      }

      const expiresAt = (item as { expiresAt?: unknown }).expiresAt
      if (expiresAt === null) {
        return true
      }

      if (typeof expiresAt !== "string") {
        return false
      }

      const expiryTimestamp = Date.parse(expiresAt)
      if (!Number.isFinite(expiryTimestamp) || expiryTimestamp <= Date.now()) {
        return false
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
    id: String(link.id),
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

  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))

  if (typeof globalThis !== "undefined" && typeof globalThis.dispatchEvent === "function") {
    globalThis.dispatchEvent(new Event(SHORT_LINK_HISTORY_UPDATED_EVENT))
  }
}
