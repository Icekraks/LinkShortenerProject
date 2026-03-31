import type { QueryClient } from "@tanstack/react-query"

import {
  getAccountHistoryQueryKey,
  mapShortLinkToAccountHistoryItem,
  prependAndDedupeAccountHistory,
  type AccountHistoryItem,
} from "@/lib/accountHistoryQuery"
import type { ActiveSession } from "@/types/account.type"
import type { CreateShortLinkSuccessResponse } from "@/types/short-link"

export const syncAccountHistoryCacheAfterCreate = ({
  queryClient,
  createdLink,
  session,
}: {
  queryClient: Pick<QueryClient, "setQueryData">
  createdLink: CreateShortLinkSuccessResponse
  session: ActiveSession | null
}) => {
  if (!session?.isLoggedIn || !session.userId) {
    return
  }

  const nextItem = mapShortLinkToAccountHistoryItem(createdLink)

  queryClient.setQueryData<AccountHistoryItem[]>(
    getAccountHistoryQueryKey(session.userId),
    (current) => {
      return prependAndDedupeAccountHistory(current ?? [], nextItem)
    },
  )
}
