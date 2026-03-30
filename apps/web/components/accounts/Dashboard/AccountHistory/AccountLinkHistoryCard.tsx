"use client"

import Link from "next/link"
import { Button } from "@components/ui/button"
import { useShareActions } from "@hooks/useShareActions"
import { ClipboardCheck, Clipboard, Download } from "lucide-react"
import { QR_CODE_OPTIONS } from "@lib/qrCode"
import QRCode from "qrcode"
import type { AccountHistoryItem } from "@lib/accountHistoryQuery"

type AccountLinkHistoryCardProps = AccountHistoryItem & {
  className?: string
}

export const AccountLinkHistoryCard = (entry: AccountLinkHistoryCardProps) => {
  const { shortUrl, originalUrl, className = "" } = entry
  const { copied, copyToClipboard, downloadDataUrl } = useShareActions({ resetDelayMs: 1500 })

  const dateToday = new Date().toISOString()
  const isExpired = entry.expiresAt ? entry.expiresAt < dateToday : false

  const handleCopy = async () => {
    await copyToClipboard(shortUrl)
  }

  const downloadQrCode = async () => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, QR_CODE_OPTIONS)
      downloadDataUrl(qrCodeDataUrl, `${entry.shortCode}-sniprUrl.png`)
    } catch (error) {
      console.error("Failed to generate QR code", error)
    }
  }

  return (
    <li className={`py-2 ${className}`}>
      <article className="grid grid-cols-3 gap-4">
        <div className="block">
          <Button
            className="px-0"
            render={<Link href={shortUrl} target="_blank" rel="noopener noreferrer" />}
            variant="link"
            nativeButton={false}
          >
            {shortUrl}
          </Button>

          <span className="block text-xs">{originalUrl}</span>
        </div>
        <div className="mt-1.5">
          <span className="text-sm text-muted-foreground">
            Created: {new Date(entry.createdAt).toLocaleDateString()}
          </span>
          {entry.expiresAt && isExpired ? (
            <span>
              <span className="block text-sm text-muted-foreground">
                Expired: {new Date(entry.expiresAt).toLocaleDateString()}
              </span>
            </span>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 min-w-21 mt-1.5">
          <Button
            type="button"
            onClick={handleCopy}
            aria-label="Copy generated short URL"
            className={`${copied ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            disabled={isExpired}
            aria-disabled={isExpired}
          >
            {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
          </Button>

          <Button
            type="button"
            onClick={downloadQrCode}
            aria-label="Download generated short URL QR Code"
            disabled={isExpired}
            aria-disabled={isExpired}
          >
            <Download className="size-4" />
          </Button>
        </div>
      </article>
    </li>
  )
}
