"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { AccountLinkHistoryCard } from "@components/accounts/Dashboard/AccountHistory/AccountLinkHistoryCard"
import {
  getAccountHistoryQueryKey,
  type AccountHistoryItem,
  type AccountHistoryResponse,
} from "@/lib/accountHistoryQuery"
import { AccountLinkCard } from "../AccountLinkCard"

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

const AccountHistoryTable = ({ userId }: { userId: string }) => {
  const {
    data: fetchedHistory,
    isPending,
    isError,
  } = useQuery({
    queryKey: getAccountHistoryQueryKey(userId),
    queryFn: fetchAccountHistory,
  })

  const [localHistory, _setLocalHistory] = useState<AccountHistoryItem[] | null>(null)
  const history = localHistory ?? fetchedHistory ?? []

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
          <AccountLinkCard key={item.id} {...item} />
        ))}
      </ol>
    </div>
  )
}

export default AccountHistoryTable
