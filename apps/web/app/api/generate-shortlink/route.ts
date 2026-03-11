import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { dbPool } from "@/lib/db"
import { CREATE_LINK_RATE_LIMIT, isCreateLinkRateLimited } from "@/helpers/rateLimitHelpers"
import { isSameOriginRequest, isSelfDomainTarget } from "@/helpers/urlHelpers"
import { encodeLinkIdToShortCode } from "@/lib/shortCode"
import {
  ALLOCATE_NEXT_LINK_ID_QUERY,
  INSERT_SHORT_LINK_WITH_CODE_QUERY,
} from "@/sql/generateShortLink"
import type { CreateShortLinkBody } from "@/types/short-link"
import QRCode from "qrcode"

export const runtime = "nodejs"

const ALLOWED_EXPIRY_HOURS = new Set([1, 4, 6, 12, 24])
const QR_CODE_OPTIONS = {
  errorCorrectionLevel: "H",
  type: "image/png",
  width: 1024,
  margin: 1,
} as const

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const rateLimited = await isCreateLinkRateLimited(request)

    if (rateLimited) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterSeconds: CREATE_LINK_RATE_LIMIT.windowSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(CREATE_LINK_RATE_LIMIT.windowSeconds),
          },
        },
      )
    }

    const body = (await request.json()) as CreateShortLinkBody
    const originalUrl = body.originalUrl?.trim()
    const expiryHours = body.expiryHours ?? 24

    if (!originalUrl) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 })
    }

    if (!Number.isInteger(expiryHours) || !ALLOWED_EXPIRY_HOURS.has(expiryHours)) {
      return NextResponse.json(
        { error: "expiryHours must be one of: 1, 4, 6, 12, 24" },
        { status: 400 },
      )
    }

    let targetUrl: URL

    try {
      targetUrl = new URL(originalUrl)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    if (isSelfDomainTarget(targetUrl, request.nextUrl)) {
      return NextResponse.json({ error: "Cannot shorten URLs from this domain" }, { status: 400 })
    }

    const normalizedUrl = targetUrl.toString()

    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + expiryHours)

    const client = await dbPool.connect()
    let created:
      | {
          id: number
          short_code: string
          original_url: string
          created_at: Date
          expires_at: Date | null
        }
      | undefined

    try {
      await client.query("BEGIN")

      const nextIdResult = await client.query<{ id: string }>(ALLOCATE_NEXT_LINK_ID_QUERY)

      const idValue = Number(nextIdResult.rows[0]?.id)

      if (!Number.isSafeInteger(idValue) || idValue < 0) {
        throw new Error("Failed to allocate a valid link id")
      }

      const shortCode = encodeLinkIdToShortCode(idValue)

      const insertResult = await client.query<{
        id: number
        short_code: string
        original_url: string
        created_at: Date
        expires_at: Date | null
      }>(INSERT_SHORT_LINK_WITH_CODE_QUERY, [idValue, shortCode, normalizedUrl, expiryDate])

      await client.query("COMMIT")
      created = insertResult.rows[0]
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }

    if (!created) {
      return NextResponse.json({ error: "Failed to create short link" }, { status: 500 })
    }

    const shortPath = `/${created.short_code}`
    const shortUrl = new URL(shortPath, request.nextUrl.origin).toString()
    const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, QR_CODE_OPTIONS)

    return NextResponse.json(
      {
        id: created.id,
        shortCode: created.short_code,
        originalUrl: created.original_url,
        createdAt: created.created_at,
        expiryHours,
        expiresAt: created.expires_at,
        shortPath,
        shortUrl,
        qrCodeDataUrl,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to create short link", error)
    return NextResponse.json({ error: "Failed to create short link" }, { status: 500 })
  }
}
