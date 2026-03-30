import type { QueryClient } from "@tanstack/react-query"

import {
  ACCOUNT_HISTORY_QUERY_KEY,
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
  if (!session?.isLoggedIn) {
    return
  }

  const nextItem = mapShortLinkToAccountHistoryItem(createdLink)

  queryClient.setQueryData<AccountHistoryItem[]>(ACCOUNT_HISTORY_QUERY_KEY, (current) => {
    return prependAndDedupeAccountHistory(current ?? [], nextItem)
  })
}
