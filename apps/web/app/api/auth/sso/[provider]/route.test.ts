import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

describe("GET /api/auth/sso/[provider]", () => {
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET
  const originalGoogleEntryUrl = process.env.SSO_GOOGLE_ENTRY_URL
  const originalGithubEntryUrl = process.env.SSO_GITHUB_ENTRY_URL
  const originalAppBaseUrl = process.env.APP_BASE_URL
  const originalAuthSessionSecret = process.env.AUTH_SESSION_SECRET

  afterAll(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId
    }

    if (originalGoogleClientSecret === undefined) {
      delete process.env.GOOGLE_CLIENT_SECRET
    } else {
      process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret
    }

    if (originalGoogleEntryUrl === undefined) {
      delete process.env.SSO_GOOGLE_ENTRY_URL
    } else {
      process.env.SSO_GOOGLE_ENTRY_URL = originalGoogleEntryUrl
    }

    if (originalGithubEntryUrl === undefined) {
      delete process.env.SSO_GITHUB_ENTRY_URL
    } else {
      process.env.SSO_GITHUB_ENTRY_URL = originalGithubEntryUrl
    }

    if (originalAppBaseUrl === undefined) {
      delete process.env.APP_BASE_URL
    } else {
      process.env.APP_BASE_URL = originalAppBaseUrl
    }

    if (originalAuthSessionSecret === undefined) {
      delete process.env.AUTH_SESSION_SECRET
    } else {
      process.env.AUTH_SESSION_SECRET = originalAuthSessionSecret
    }
  })

  beforeEach(() => {
    delete process.env.APP_BASE_URL
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.SSO_GOOGLE_ENTRY_URL
    delete process.env.SSO_GITHUB_ENTRY_URL
    process.env.AUTH_SESSION_SECRET = "test-auth-session-secret"
  })

  it("redirects Google to the Google OAuth authorize endpoint when client credentials are configured", async () => {
    process.env.APP_BASE_URL = "https://snipr.dev"
    process.env.GOOGLE_CLIENT_ID = "google-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret"

    const { GET } = await import("./route")
    const request = new NextRequest(
      "http://localhost:3000/api/auth/sso/google?intent=register&returnTo=/account/dashboard",
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: "google" }),
    })

    expect(response.status).toBe(307)
    const location = response.headers.get("location")

    expect(location).not.toBeNull()

    const redirectUrl = new URL(location ?? "http://localhost")

    expect(redirectUrl.origin).toBe("https://accounts.google.com")
    expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth")
    expect(redirectUrl.searchParams.get("client_id")).toBe("google-client-id")
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://snipr.dev/api/auth/sso/google/callback",
    )
    expect(redirectUrl.searchParams.get("response_type")).toBe("code")
    expect(redirectUrl.searchParams.get("scope")).toBe("openid email profile")
    expect(redirectUrl.searchParams.get("prompt")).toBe("select_account")
    expect(redirectUrl.searchParams.get("state")).toBeTruthy()
    expect(response.cookies.get("link_shortener_sso_state")?.value).toBeTruthy()
  })

  it("falls back to provider entry urls for non-native providers", async () => {
    process.env.APP_BASE_URL = "https://snipr.dev"
    process.env.SSO_GITHUB_ENTRY_URL = "https://auth.example.com/github/start"

    const { GET } = await import("./route")
    const request = new NextRequest(
      "http://localhost:3000/api/auth/sso/github?intent=register&returnTo=/account/dashboard",
    )

    const response = await GET(request, {
      params: Promise.resolve({ provider: "github" }),
    })

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://auth.example.com/github/start?intent=register&provider=github&returnTo=https%3A%2F%2Fsnipr.dev%2Faccount%2Fdashboard",
    )
  })

  it("returns 404 for unsupported providers", async () => {
    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/auth/sso/discord")

    const response = await GET(request, {
      params: Promise.resolve({ provider: "discord" }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toBe("Unsupported SSO provider")
  })

  it("returns 503 when the provider is not configured", async () => {
    const { GET } = await import("./route")
    const request = new NextRequest("http://localhost:3000/api/auth/sso/google")

    const response = await GET(request, {
      params: Promise.resolve({ provider: "google" }),
    })
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe("SSO provider is not configured")
  })
})
