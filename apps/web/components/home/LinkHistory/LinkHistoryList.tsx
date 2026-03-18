"use client"

import { useEffect, useState } from "react"
import {
  getShortLinkHistory,
  SHORT_LINK_HISTORY_UPDATED_EVENT,
  type ShortLinkHistoryEntry,
} from "@lib/shortLinkHistory"

import { LinkHistoryCard } from "@components/home/LinkHistory/LinkHistoryCard"

const LinkHistoryList = () => {
  const [history, setHistory] = useState<ShortLinkHistoryEntry[]>([])

  useEffect(() => {
    const syncHistory = () => {
      setHistory(getShortLinkHistory())
    }

    syncHistory()

    globalThis.addEventListener(SHORT_LINK_HISTORY_UPDATED_EVENT, syncHistory)
    globalThis.addEventListener("storage", syncHistory)

    return () => {
      globalThis.removeEventListener(SHORT_LINK_HISTORY_UPDATED_EVENT, syncHistory)
      globalThis.removeEventListener("storage", syncHistory)
    }
  }, [])

  if (history.length === 0) {
    return <p className="text-sm text-gray-500">No history available.</p>
  }

  return (
    <div className="overflow-x-auto">
      <ol>
        {history.map((item) => (
          <LinkHistoryCard
            key={item.id}
            {...item}
            className={"border-b border-gray-200 last:border-0"}
          />
        ))}
      </ol>
    </div>
  )
}

export default LinkHistoryList
