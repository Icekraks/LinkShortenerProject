import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  GET_USER_PERMANENT_LINKS_QUERY,
  SOFT_DELETE_USER_PERMANENT_LINK_QUERY,
} from "@/sql/getUserPermanentLinks"

import { dbPool } from "@/lib/db"
import { getActiveSession } from "@/lib/authSession"

export const runtime = "nodejs"

const toLinkId = (value: unknown) => {
  const numberValue = typeof value === "string" ? Number.parseInt(value, 10) : Number(value)

  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) {
    return null
  }

  return numberValue
}

export async function GET(request: NextRequest) {
  try {
    const session = await getActiveSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
          history: [],
        },
        { status: 401 },
      )
    }

    const result = await dbPool.query<{
      id: number
      short_code: string
      original_url: string
      created_at: Date
      expires_at: Date | null
    }>(GET_USER_PERMANENT_LINKS_QUERY, [session.userId])

    const history = result.rows.map((row) => {
      const shortPath = `/${row.short_code}`
      const shortUrl = new URL(shortPath, request.nextUrl.origin).toString()

      return {
        id: String(row.id),
        shortCode: row.short_code,
        shortUrl,
        originalUrl: row.original_url,
        createdAt: row.created_at.toISOString(),
        expiresAt: row.expires_at?.toISOString() ?? null,
      }
    })

    return NextResponse.json(
      {
        ok: true,
        history,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to fetch permanent links", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch permanent links",
        history: [],
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getActiveSession()

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    const body = (await request.json()) as { id?: unknown }
    const linkId = toLinkId(body.id)

    if (!linkId) {
      return NextResponse.json(
        {
          ok: false,
          error: "A valid permanent link id is required",
        },
        { status: 400 },
      )
    }

    const result = await dbPool.query<{ id: number }>(SOFT_DELETE_USER_PERMANENT_LINK_QUERY, [
      linkId,
      session.userId,
    ])

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Permanent link not found",
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        deletedId: String(result.rows[0]?.id ?? linkId),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to delete permanent link", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to delete permanent link",
      },
      { status: 500 },
    )
  }
}
