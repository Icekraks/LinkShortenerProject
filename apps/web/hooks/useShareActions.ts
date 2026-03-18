import { useCallback, useEffect, useRef, useState } from "react"

type UseShareActionsOptions = {
  resetDelayMs?: number
  onError?: (error: unknown) => void
}

export const useShareActions = ({ resetDelayMs = 2000, onError }: UseShareActionsOptions = {}) => {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyToClipboard = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value)

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        setCopied(true)

        timeoutRef.current = setTimeout(() => {
          setCopied(false)
          timeoutRef.current = null
        }, resetDelayMs)
      } catch (error) {
        onError?.(error)
      }
    },
    [onError, resetDelayMs],
  )

  const downloadDataUrl = useCallback(
    (dataUrl: string, fileName: string) => {
      try {
        const anchor = document.createElement("a")
        anchor.href = dataUrl
        anchor.download = fileName
        anchor.click()
      } catch (error) {
        onError?.(error)
      }
    },
    [onError],
  )

  return {
    copied,
    copyToClipboard,
    downloadDataUrl,
  }
}
