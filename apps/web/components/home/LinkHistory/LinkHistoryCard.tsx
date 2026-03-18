"use client"

import Link from "next/link"
import { Button } from "@components/ui/button"
import type { ShortLinkHistoryEntry } from "@lib/shortLinkHistory"
import { useShareActions } from "@hooks/useShareActions"
import { ClipboardCheck, Clipboard, Download } from "lucide-react"
import { QR_CODE_OPTIONS } from "@lib/qrCode"
import QRCode from "qrcode"

type LinkHistoryCardProps = ShortLinkHistoryEntry & {
  className?: string
}

export const LinkHistoryCard = (entry: LinkHistoryCardProps) => {
  const { shortUrl, originalUrl, className = "" } = entry
  const { copied, copyToClipboard, downloadDataUrl } = useShareActions({ resetDelayMs: 1500 })

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
      <article className="flex items-center justify-between">
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
        <div className="flex gap-2">
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
        </div>
      </article>
    </li>
  )
}
