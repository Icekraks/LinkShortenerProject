import { NextResponse } from "next/server"

import { getActiveSession } from "@/lib/authSession"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await getActiveSession()

    return NextResponse.json(
      {
        ok: true,
        ...session,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to retrieve auth session status", error)

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to retrieve session",
        isLoggedIn: false,
        userId: null,
      },
      { status: 200 },
    )
  }
}
