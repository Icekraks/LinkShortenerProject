import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { dbPool } from "@/lib/db"
import { isSameOriginRequest } from "@/helpers/urlHelpers"

export const runtime = "nodejs"

const AUTH_SESSION_COOKIE_NAME = "link_shortener_session"

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (sessionToken) {
      await dbPool.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken])
    }

    const response = NextResponse.json({ ok: true }, { status: 200 })

    response.cookies.set({
      name: AUTH_SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error("Failed to logout user", error)
    return NextResponse.json({ error: "Failed to logout user" }, { status: 500 })
  }
}
