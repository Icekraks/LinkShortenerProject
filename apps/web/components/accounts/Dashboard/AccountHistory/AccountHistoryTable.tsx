"use client"

import { useQuery } from "@tanstack/react-query"

import { AccountLinkHistoryCard } from "@components/accounts/Dashboard/AccountHistory/AccountLinkHistoryCard"
import {
  ACCOUNT_HISTORY_QUERY_KEY,
  type AccountHistoryItem,
  type AccountHistoryResponse,
} from "@/lib/accountHistoryQuery"

const fetchAccountHistory = async () => {
  const response = await fetch("/api/account/history", {
    method: "GET",
    cache: "no-store",
  })

  if (response.status === 401) {
    return [] as AccountHistoryItem[]
  }

  if (!response.ok) {
    throw new Error("Failed to fetch account history")
  }

  const body = (await response.json()) as AccountHistoryResponse

  if (!body.ok) {
    throw new Error(body.error || "Failed to fetch account history")
  }

  return body.history
}

const AccountHistoryTable = () => {
  const {
    data: history = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ACCOUNT_HISTORY_QUERY_KEY,
    queryFn: fetchAccountHistory,
  })

  if (isPending) {
    return <p className="text-sm text-gray-500">Loading history...</p>
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load account history.</p>
  }

  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No history available.</p>
  }

  return (
    <div className="overflow-x-auto">
      <ol>
        {history.map((item) => (
          <AccountLinkHistoryCard
            key={item.id}
            {...item}
            className={"border-b border-gray-200 last:border-0"}
          />
        ))}
      </ol>
    </div>
  )
}

export default AccountHistoryTable
