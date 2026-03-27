import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"

import { createSignedAuthSessionToken } from "@/lib/authToken"
import { AUTH_SESSION_COOKIE_NAME } from "@/lib/authSession"
import { dbPool } from "@/lib/db"
import { isSameOriginRequest } from "@/helpers/urlHelpers"
import { getGoogleSsoConfig } from "@/lib/ssoProviders"
import { readSignedSsoStateValue, SSO_STATE_COOKIE_NAME } from "@/lib/ssoState"

export const runtime = "nodejs"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
const SESSION_TTL_DAYS = 30
const GOOGLE_POSTMESSAGE_REDIRECT_URI = "postmessage"

type GoogleTokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

type GoogleUserProfile = {
  sub?: string
  email?: string
  email_verified?: boolean
}

const getRequestBaseUrl = (request: NextRequest) => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim()

  try {
    return configuredBaseUrl ? new URL(configuredBaseUrl) : new URL(request.nextUrl.origin)
  } catch {
    return new URL(request.nextUrl.origin)
  }
}

const buildGoogleCallbackUrl = (request: NextRequest) => {
  const baseUrl = getRequestBaseUrl(request)

  baseUrl.pathname = "/api/auth/sso/google/callback"
  baseUrl.search = ""

  return baseUrl.toString()
}

const buildFailureRedirectUrl = ({
  request,
  pathname,
  reason,
}: {
  request: NextRequest
  pathname: string
  reason: string
}) => {
  const baseUrl = getRequestBaseUrl(request)

  baseUrl.pathname = pathname
  baseUrl.search = ""
  baseUrl.searchParams.set("sso", "error")
  baseUrl.searchParams.set("reason", reason)

  return baseUrl
}

const buildSessionExpiry = () => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)
  return expiresAt
}

const clearSsoStateCookie = (response: NextResponse) => {
  response.cookies.set({
    name: SSO_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

const exchangeCodeForGoogleTokens = async ({
  code,
  redirectUri,
}: {
  code: string
  redirectUri: string
}) => {
  const googleSsoConfig = getGoogleSsoConfig()

  if (!googleSsoConfig) {
    throw new Error("Google SSO is not configured")
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: googleSsoConfig.clientId,
      client_secret: googleSsoConfig.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to exchange Google authorization code")
  }

  const tokenData = (await response.json()) as GoogleTokenResponse

  if (!tokenData.access_token) {
    throw new Error("Google did not return an access token")
  }

  return tokenData
}

const getGoogleUserProfile = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile")
  }

  const profile = (await response.json()) as GoogleUserProfile

  if (!profile.sub || !profile.email) {
    throw new Error("Google profile response is missing required fields")
  }

  return {
    providerUserId: profile.sub,
    email: profile.email.trim().toLowerCase(),
    emailVerified: profile.email_verified === true,
  }
}

const findOrCreateUserForGoogleAccount = async ({
  providerUserId,
  email,
  emailVerified,
  accessToken,
  refreshToken,
  tokenExpiresAt,
}: {
  providerUserId: string
  email: string
  emailVerified: boolean
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
}) => {
  const client = await dbPool.connect()

  try {
    await client.query("BEGIN")

    const existingAccountResult = await client.query<{ user_id: string }>(
      `SELECT user_id
       FROM accounts
       WHERE provider = $1
         AND provider_user_id = $2
       LIMIT 1`,
      ["google", providerUserId],
    )

    let userId = existingAccountResult.rows[0]?.user_id ?? null

    if (!userId) {
      const existingUserResult = await client.query<{ id: string; email_verified: boolean }>(
        `SELECT id, email_verified
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email],
      )

      const existingUser = existingUserResult.rows[0]

      if (existingUser) {
        userId = existingUser.id

        if (emailVerified && !existingUser.email_verified) {
          await client.query(
            `UPDATE users
             SET email_verified = TRUE,
                 updated_at = NOW()
             WHERE id = $1`,
            [userId],
          )
        }
      } else {
        const userResult = await client.query<{ id: string }>(
          `INSERT INTO users (email, email_verified)
           VALUES ($1, $2)
           RETURNING id`,
          [email, emailVerified],
        )

        userId = userResult.rows[0]?.id ?? null
      }
    }

    if (!userId) {
      throw new Error("Failed to resolve user for Google account")
    }

    await client.query(
      `INSERT INTO accounts (
         user_id,
         provider,
         provider_user_id,
         provider_email,
         provider_email_verified,
         access_token,
         refresh_token,
         token_expires_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (provider, provider_user_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         provider_email = EXCLUDED.provider_email,
         provider_email_verified = EXCLUDED.provider_email_verified,
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, accounts.refresh_token),
         token_expires_at = EXCLUDED.token_expires_at,
         updated_at = NOW()`,
      [
        userId,
        "google",
        providerUserId,
        email,
        emailVerified,
        accessToken,
        refreshToken,
        tokenExpiresAt,
      ],
    )

    await client.query("COMMIT")

    return userId
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

const createSessionResponse = ({
  userId,
  response,
}: {
  userId: string
  response: NextResponse
}) => {
  const expiresAt = buildSessionExpiry()
  const sessionToken = createSignedAuthSessionToken({
    userId,
    expiresAt,
  })

  response.cookies.set({
    name: AUTH_SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const ssoStateCookie = cookieStore.get(SSO_STATE_COOKIE_NAME)?.value
  const parsedState = ssoStateCookie ? readSignedSsoStateValue(ssoStateCookie) : null
  const intentPath = parsedState?.intent === "register" ? "/account/register" : "/account/login"
  const stateParam = request.nextUrl.searchParams.get("state")
  const code = request.nextUrl.searchParams.get("code")
  const oauthError = request.nextUrl.searchParams.get("error")

  if (oauthError) {
    const response = NextResponse.redirect(
      buildFailureRedirectUrl({ request, pathname: intentPath, reason: oauthError }),
    )
    clearSsoStateCookie(response)
    return response
  }

  if (!parsedState || parsedState.provider !== "google") {
    const response = NextResponse.redirect(
      buildFailureRedirectUrl({ request, pathname: intentPath, reason: "invalid_state" }),
    )
    clearSsoStateCookie(response)
    return response
  }

  if (!stateParam || stateParam !== parsedState.state || !code) {
    const response = NextResponse.redirect(
      buildFailureRedirectUrl({ request, pathname: intentPath, reason: "invalid_callback" }),
    )
    clearSsoStateCookie(response)
    return response
  }

  try {
    const tokenData = await exchangeCodeForGoogleTokens({
      code,
      redirectUri: buildGoogleCallbackUrl(request),
    })
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error("Google did not return an access token")
    }

    const googleProfile = await getGoogleUserProfile(accessToken)
    const tokenExpiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null

    const userId = await findOrCreateUserForGoogleAccount({
      providerUserId: googleProfile.providerUserId,
      email: googleProfile.email,
      emailVerified: googleProfile.emailVerified,
      accessToken,
      refreshToken: tokenData.refresh_token ?? null,
      tokenExpiresAt,
    })

    const response = NextResponse.redirect(parsedState.returnTo)

    createSessionResponse({ userId, response })
    clearSsoStateCookie(response)

    return response
  } catch (error) {
    console.error("Failed to complete Google SSO", error)

    const response = NextResponse.redirect(
      buildFailureRedirectUrl({ request, pathname: intentPath, reason: "google_sso_failed" }),
    )
    clearSsoStateCookie(response)
    return response
  }
}

const getSafeReturnToPath = (value: unknown) => {
  if (typeof value !== "string") {
    return "/account/dashboard"
  }

  return value.startsWith("/") ? value : "/account/dashboard"
}

const getIntentPath = (value: unknown) =>
  value === "register" ? "/account/register" : "/account/login"

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }

  const code = (body as { code?: unknown }).code
  const intentPath = getIntentPath((body as { intent?: unknown }).intent)
  const returnTo = getSafeReturnToPath((body as { returnTo?: unknown }).returnTo)

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Google authorization code is required" }, { status: 400 })
  }

  try {
    const tokenData = await exchangeCodeForGoogleTokens({
      code: code.trim(),
      redirectUri: GOOGLE_POSTMESSAGE_REDIRECT_URI,
    })
    const accessToken = tokenData.access_token

    if (!accessToken) {
      throw new Error("Google did not return an access token")
    }

    const googleProfile = await getGoogleUserProfile(accessToken)
    const tokenExpiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null

    const userId = await findOrCreateUserForGoogleAccount({
      providerUserId: googleProfile.providerUserId,
      email: googleProfile.email,
      emailVerified: googleProfile.emailVerified,
      accessToken,
      refreshToken: tokenData.refresh_token ?? null,
      tokenExpiresAt,
    })

    const response = NextResponse.json(
      {
        ok: true,
        redirectTo: returnTo,
      },
      { status: 200 },
    )

    createSessionResponse({ userId, response })

    return response
  } catch (error) {
    console.error("Failed to complete Google SSO via JavaScript client", error)

    return NextResponse.json(
      {
        error: "Failed to sign in with Google",
        redirectTo: intentPath,
      },
      { status: 500 },
    )
  }
}
