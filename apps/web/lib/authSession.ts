import "server-only"

import { cookies } from "next/headers"

import { getSignedAuthSessionTokenUserId } from "@lib/authToken"
import type { ActiveSession } from "@/types/account.type"

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
  const { isLoggedIn } = await getActiveSession()
  return isLoggedIn
}

export const getActiveSession = async (): Promise<ActiveSession> => {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return {
        isLoggedIn: false,
        userId: null,
      }
    }

    const userId = getSignedAuthSessionTokenUserId(sessionToken)

    if (userId) {
      return {
        isLoggedIn: true,
        userId,
      }
    }

    return {
      isLoggedIn: false,
      userId: null,
    }
  } catch (error) {
    console.error("Failed to verify auth session", error)
    return {
      isLoggedIn: false,
      userId: null,
    }
  }
}

export const getActiveSessionUserId = async () => {
  const { userId } = await getActiveSession()
  return userId
}
