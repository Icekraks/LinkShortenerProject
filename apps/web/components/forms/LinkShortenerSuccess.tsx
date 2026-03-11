import type { CreateShortLinkSuccessResponse } from "@/types/short-link"
import { useState } from "react"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/input-group"
import { cn } from "@/lib/utils"
import { CircleCheckIcon, Clipboard, ClipboardCheck } from "lucide-react"

type LinkShortenerSuccessProps = {
  createdLink: CreateShortLinkSuccessResponse
  resetForm: () => void
}

const LinkShortenerSuccess = ({ createdLink, resetForm }: LinkShortenerSuccessProps) => {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCopy = async () => {
    setError(null)
    if (!createdLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(createdLink.shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Unable to copy link to clipboard")
    }
  }

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = createdLink.qrCodeDataUrl
    a.download = `${createdLink.shortCode}-sniprUrl.png`
    a.click()
  }
  return (
    <div className="mt-3 space-y-2" role="status" aria-live="polite" aria-atomic="true">
      <header className="mb-4">
        <h2 className="flex flex-row items-center gap-x-4 mb-2">
          <CircleCheckIcon className="size-4 text-emerald-600" aria-hidden="true" /> Short link is
          ready!
        </h2>
        <p className="text-muted-foreground text-sm">
          Your shortened URL is ready to use. You can copy the URL or download the QR code below to
          share your link.
        </p>
      </header>
      <InputGroup className="mb-4">
        <InputGroupInput value={createdLink.shortUrl} readOnly aria-label="Generated short URL" />
        <InputGroupAddon align="inline-end" className="pr-0">
          <Button
            size="icon"
            variant="ghost"
            type="button"
            onClick={handleCopy}
            aria-label="Copy generated short URL"
          >
            {copied ? <ClipboardCheck className="size-4" /> : <Clipboard className="size-4" />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <section
        aria-label="Short Link Actions"
        className="flex flex-col gap-2 md:flex-row md:items-center md:w-3/4"
      >
        <Button
          type="button"
          onClick={handleCopy}
          aria-label="Copy generated short URL"
          className={cn("", copied && "bg-emerald-600 hover:bg-emerald-700")}
        >
          {copied ? "Copied Shortened URL" : "Copy Shortened URL"}
        </Button>
        <Button
          type="button"
          onClick={handleDownload}
          aria-label="Download generated short URL QR Code"
        >
          Download QR Code
        </Button>

        <Button type="button" onClick={resetForm} aria-label="Generate a new short link">
          Generate a New Short Link
        </Button>
      </section>

      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert" aria-live="assertive">
          {error}
        </p>
      ) : null}
      {copied ? <p className="sr-only">Generated short URL copied to clipboard</p> : null}
    </div>
  )
}

export default LinkShortenerSuccess
