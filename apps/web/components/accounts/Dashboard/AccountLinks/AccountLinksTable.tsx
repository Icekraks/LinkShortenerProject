"use client"
import {
  getAccountHistoryQueryKey,
  getAccountPermanentLinksQueryKey,
  type AccountHistoryItem,
  type AccountHistoryResponse,
} from "@/lib/accountHistoryQuery"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AccountLinkCard } from "@components/accounts/Dashboard/AccountLinkCard"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { CircleX } from "lucide-react"

const fetchAccountLinks = async () => {
  const response = await fetch("/api/account/permanent-links", {
    method: "GET",
    cache: "no-store",
  })
  if (response.status === 401) {
    return [] as AccountHistoryItem[]
  }
  if (!response.ok) {
    throw new Error("Failed to fetch account links")
  }
  const body = (await response.json()) as AccountHistoryResponse

  if (!body.ok) {
    throw new Error(body.error || "Failed to fetch account links")
  }

  return body.history
}

const handleDelete = async (id: string) => {
  const response = await fetch(`/api/account/permanent-links`, {
    method: "DELETE",
    body: JSON.stringify({ id }),
    headers: {
      "content-type": "application/json",
    },
  })
  if (!response.ok) {
    throw new Error("Failed to delete short URL")
  }
}

const AccountLinksTable = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient()
  const {
    data: links,
    isPending,
    isError,
  } = useQuery({
    queryKey: getAccountPermanentLinksQueryKey(userId),
    queryFn: fetchAccountLinks,
  })

  const handleDeleteClick = useCallback(
    async (id: string) => {
      const permanentLinksQueryKey = getAccountPermanentLinksQueryKey(userId)
      const historyQueryKey = getAccountHistoryQueryKey(userId)

      const previousPermanentLinks =
        queryClient.getQueryData<AccountHistoryItem[]>(permanentLinksQueryKey) ?? []
      const previousHistoryLinks =
        queryClient.getQueryData<AccountHistoryItem[]>(historyQueryKey) ?? []

      queryClient.setQueryData<AccountHistoryItem[]>(
        permanentLinksQueryKey,
        previousPermanentLinks.filter((link) => link.id !== id),
      )

      const nowIso = new Date().toISOString()
      queryClient.setQueryData<AccountHistoryItem[]>(
        historyQueryKey,
        previousHistoryLinks.map((link) =>
          link.id === id
            ? {
                ...link,
                expiresAt: nowIso,
              }
            : link,
        ),
      )

      try {
        await handleDelete(id)
      } catch (error) {
        queryClient.setQueryData<AccountHistoryItem[]>(
          permanentLinksQueryKey,
          previousPermanentLinks,
        )
        queryClient.setQueryData<AccountHistoryItem[]>(historyQueryKey, previousHistoryLinks)
        console.error("Failed to delete short URL", error)
      }
    },
    [queryClient, userId],
  )

  if (isPending) {
    return <p className="text-sm text-gray-500">Loading permanent links...</p>
  }

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load account permanent links.</p>
  }

  if (links.length === 0) {
    return <p className="text-sm text-gray-500">No permanent links available.</p>
  }

  return (
    <div className="overflow-x-auto">
      <ol>
        {links.map((link) => (
          <AccountLinkCard
            key={link.id}
            {...link}
            extraControls={
              <Button
                type="button"
                onClick={() => handleDeleteClick(link.id)}
                aria-label="Delete this short URL"
              >
                <CircleX className="size-4" />
              </Button>
            }
          />
        ))}
      </ol>
    </div>
  )
}

export default AccountLinksTable
