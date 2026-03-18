"use client"

import { getShortLinkHistory } from "@lib/shortLinkHistory"
import { useIsMounted } from "@hooks/useIsMounted"

import { LinkHistoryCard } from "@components/home/LinkHistory/LinkHistoryCard"

const LinkHistoryList = () => {
  const isMounted = useIsMounted()
  const history = isMounted ? getShortLinkHistory() : []

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
