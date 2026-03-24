import "server-only"

import { cookies } from "next/headers"

import { dbPool } from "@/lib/db"

export const AUTH_SESSION_COOKIE_NAME = "link_shortener_session"

export const deleteActiveSession = async () => {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

  if (sessionToken) {
    await dbPool.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken])
  }

  cookieStore.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export const hasActiveSession = async () => {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return false
    }

    const result = await dbPool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM sessions
         WHERE session_token = $1
           AND expires_at > NOW()
       ) AS exists`,
      [sessionToken],
    )

    return result.rows[0]?.exists ?? false
  } catch (error) {
    console.error("Failed to verify auth session", error)
    return false
  }
}
