import "server-only"

import { cookies } from "next/headers"

import { isSignedAuthSessionTokenValid } from "@lib/authToken"

export const AUTH_SESSION_COOKIE_NAME = "link_shortener_session"

export const deleteActiveSession = async () => {
  const cookieStore = await cookies()

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

    return isSignedAuthSessionTokenValid(sessionToken)
  } catch (error) {
    console.error("Failed to verify auth session", error)
    return false
  }
}
