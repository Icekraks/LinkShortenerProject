import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { GET_USER_HISTORY_QUERY } from "@/sql/getUserHistory"

import { dbPool } from "@/lib/db"
import { getActiveSession } from "@/lib/authSession"

export const runtime = "nodejs"

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
    }>(GET_USER_HISTORY_QUERY, [session.userId])

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
    console.error("Failed to fetch account history", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch account history",
        history: [],
      },
      { status: 500 },
    )
  }
}
