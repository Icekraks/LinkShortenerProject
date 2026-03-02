import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { NextRequest } from "next/server"

import { RESOLVE_LINK_RATE_LIMIT, isResolveLinkRateLimited } from "@/helpers/rateLimitHelpers"
import { getActiveLinkByShortCode } from "@/helpers/shortLinkHelpers"

export const runtime = "nodejs"

const shortCodePattern = /^[a-z0-9]{4,}$/

export default async function ShortCodePage({
  params,
}: {
  params: Promise<{ shortCode: string }>
}) {
  const { shortCode } = await params
  const normalizedShortCode = shortCode.toLowerCase()
  let rateLimited = false
  let destinationUrl: string | null = null

  if (!shortCodePattern.test(normalizedShortCode)) {
    notFound()
  }

  try {
    const requestHeaders = await headers()
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000"

    const request = new NextRequest(`${protocol}://${host}/${normalizedShortCode}`, {
      headers: requestHeaders,
    })

    rateLimited = await isResolveLinkRateLimited(request)

    if (rateLimited) {
      destinationUrl = null
    } else {
      const row = await getActiveLinkByShortCode(normalizedShortCode)
      destinationUrl = row?.original_url ?? null
    }
  } catch (error) {
    console.error("Failed to resolve short link", error)
    return notFound()
  }

  if (rateLimited) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold font-mono">Too many requests</h1>
        <p className="max-w-md text-muted-foreground">
          Please try again shortly. You can request this link again in about{" "}
          {RESOLVE_LINK_RATE_LIMIT.windowSeconds} seconds.
        </p>
      </main>
    )
  }

  if (!destinationUrl) {
    notFound()
  }

  redirect(destinationUrl)
}
