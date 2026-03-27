import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomBytes } from "node:crypto"

import { createSignedSsoStateValue, SSO_STATE_COOKIE_NAME } from "@/lib/ssoState"
import {
  getGoogleSsoConfig,
  getSsoEntryUrl,
  isSsoIntent,
  isSsoProviderId,
} from "@/lib/ssoProviders"

export const runtime = "nodejs"

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const SSO_STATE_TTL_SECONDS = 60 * 10

const getRequestBaseUrl = (request: NextRequest) => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()

  try {
    return configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
  } catch {
    return new URL(request.nextUrl.origin)
  }
}

const buildReturnToUrl = (request: NextRequest, returnToPath: string | null) => {
  const baseUrl = getRequestBaseUrl(request)
  const safeReturnToPath = returnToPath?.startsWith("/") ? returnToPath : "/account/dashboard"

  baseUrl.pathname = safeReturnToPath
  baseUrl.search = ""

  return baseUrl.toString()
}

const buildGoogleCallbackUrl = (request: NextRequest) => {
  const baseUrl = getRequestBaseUrl(request)

  baseUrl.pathname = "/api/auth/sso/google/callback"
  baseUrl.search = ""

  return baseUrl.toString()
}

const buildGoogleAuthorizeUrl = ({ request, state }: { request: NextRequest; state: string }) => {
  const googleSsoConfig = getGoogleSsoConfig()

  if (!googleSsoConfig) {
    return null
  }

  const redirectUrl = new URL(GOOGLE_AUTHORIZE_URL)
  redirectUrl.searchParams.set("client_id", googleSsoConfig.clientId)
  redirectUrl.searchParams.set("redirect_uri", buildGoogleCallbackUrl(request))
  redirectUrl.searchParams.set("response_type", "code")
  redirectUrl.searchParams.set("scope", "openid email profile")
  redirectUrl.searchParams.set("state", state)
  redirectUrl.searchParams.set("prompt", "select_account")

  return redirectUrl
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params
  const normalizedProvider = provider.trim().toLowerCase()

  if (!isSsoProviderId(normalizedProvider)) {
    return NextResponse.json({ error: "Unsupported SSO provider" }, { status: 404 })
  }

  const intentParam = request.nextUrl.searchParams.get("intent")
  const intent = isSsoIntent(intentParam) ? intentParam : "login"
  const returnTo = buildReturnToUrl(request, request.nextUrl.searchParams.get("returnTo"))

  if (normalizedProvider === "google") {
    const state = randomBytes(24).toString("base64url")
    const googleAuthorizeUrl = buildGoogleAuthorizeUrl({ request, state })

    if (googleAuthorizeUrl) {
      const expiresAt = new Date(Date.now() + SSO_STATE_TTL_SECONDS * 1000)
      const response = NextResponse.redirect(googleAuthorizeUrl)

      response.cookies.set({
        name: SSO_STATE_COOKIE_NAME,
        value: createSignedSsoStateValue({
          provider: normalizedProvider,
          state,
          intent,
          returnTo,
          expiresAt,
        }),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SSO_STATE_TTL_SECONDS,
        expires: expiresAt,
      })

      return response
    }
  }

  const entryUrl = getSsoEntryUrl(normalizedProvider)

  if (!entryUrl) {
    return NextResponse.json({ error: "SSO provider is not configured" }, { status: 503 })
  }

  const redirectUrl = new URL(entryUrl, request.nextUrl.origin)

  redirectUrl.searchParams.set("intent", intent)
  redirectUrl.searchParams.set("provider", normalizedProvider)
  redirectUrl.searchParams.set("returnTo", returnTo)

  return NextResponse.redirect(redirectUrl)
}
