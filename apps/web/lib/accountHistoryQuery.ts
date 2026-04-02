import type { CreateShortLinkSuccessResponse } from "@/types/short-link"
import type { ShortLinkHistoryEntry } from "@/lib/shortLinkHistory"

export const ACCOUNT_HISTORY_QUERY_KEY = "account-history"
export const ACCOUNT_PERMANENT_LINKS_QUERY_KEY = "account-permanent-links"

export const getAccountHistoryQueryKey = (userId: string) => {
  return [ACCOUNT_HISTORY_QUERY_KEY, userId] as const
}

export const getAccountPermanentLinksQueryKey = (userId: string) => {
  return [ACCOUNT_PERMANENT_LINKS_QUERY_KEY, userId] as const
}

export type AccountHistoryItem = ShortLinkHistoryEntry & {
  createdAt: string
}

export type AccountHistoryResponse = {
  ok: boolean
  history: AccountHistoryItem[]
  error?: string
}

export const mapShortLinkToAccountHistoryItem = (
  link: CreateShortLinkSuccessResponse,
): AccountHistoryItem => {
  return {
    id: String(link.id),
    shortCode: link.shortCode,
    shortUrl: link.shortUrl,
    originalUrl: link.originalUrl,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  }
}

export const prependAndDedupeAccountHistory = (
  current: AccountHistoryItem[],
  nextItem: AccountHistoryItem,
) => {
  const deduped = current.filter(
    (item) => item.id !== nextItem.id && item.shortCode !== nextItem.shortCode,
  )

  return [nextItem, ...deduped].slice(0, 100)
}
