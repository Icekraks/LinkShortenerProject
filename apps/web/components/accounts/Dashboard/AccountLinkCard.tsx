"use client"

import Link from "next/link"
import { Button } from "@components/ui/button"
import { useShareActions } from "@hooks/useShareActions"
import { ClipboardCheck, Clipboard, Download } from "lucide-react"
import { QR_CODE_OPTIONS } from "@lib/qrCode"
import QRCode from "qrcode"
import type { AccountHistoryItem } from "@lib/accountHistoryQuery"

type AccountLinkCardProps = AccountHistoryItem & {
  className?: string
  extraControls?: React.ReactNode
}

export const AccountLinkCard = (entry: AccountLinkCardProps) => {
  const { shortUrl, originalUrl, className = "", extraControls } = entry
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
    <li className={`border-b border-gray-200 last:border-0 py-2 ${className}`}>
      <article className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <div className="mt-1.5 flex justify-end md:justify-start">
          <span className="w-1/2 text-sm text-muted-foreground">
            Created: {new Date(entry.createdAt).toLocaleDateString()}
          </span>
          {entry.expiresAt && isExpired ? (
            <span className="w-1/2 block text-sm text-muted-foreground">
              Expired: {new Date(entry.expiresAt).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        <div className="flex md:justify-end gap-2 min-w-21 mt-1.5">
          {!isExpired && (
            <>
              <Button
                type="button"
                onClick={handleCopy}
                aria-label="Copy generated short URL"
                className={`${copied ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
              </Button>
              <Button
                type="button"
                onClick={downloadQrCode}
                aria-label="Download generated short URL QR Code"
              >
                <Download className="size-4" />
              </Button>
              {extraControls}
            </>
          )}
        </div>
      </article>
    </li>
  )
}
