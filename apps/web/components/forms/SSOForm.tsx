"use client"

import { Chrome, Github, Building2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@ui/button"

import type { EnabledSsoProvider, SsoIntent, SsoProviderId } from "@/lib/ssoProviders"
import { cn } from "@/lib/utils"

const GOOGLE_GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client"

type GoogleCodeClientResponse = {
  code?: string
  error?: string
  error_description?: string
}

type GoogleCodeClient = {
  requestCode: () => void
}

type GoogleOauth2 = {
  initCodeClient: (config: {
    client_id: string
    scope: string
    ux_mode: "popup"
    callback: (response: GoogleCodeClientResponse) => void
  }) => GoogleCodeClient
}

type GoogleAccounts = {
  oauth2: GoogleOauth2
}

type GoogleGlobal = {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: GoogleGlobal
  }
}

const providerIcons: Record<SsoProviderId, typeof Chrome> = {
  google: Chrome,
  github: Github,
  microsoft: Building2,
}

type SSOFormProps = {
  intent: SsoIntent
  providers: EnabledSsoProvider[]
  className?: string
}

let googleScriptLoadPromise: Promise<void> | null = null

const loadGoogleScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Sign-In is only available in the browser"))
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (googleScriptLoadPromise) {
    return googleScriptLoadPromise
  }

  googleScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GSI_SCRIPT_URL}"]`,
    )

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google script")),
        {
          once: true,
        },
      )
      return
    }

    const script = document.createElement("script")
    script.src = GOOGLE_GSI_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Google script"))
    document.head.appendChild(script)
  }).finally(() => {
    if (!window.google?.accounts?.oauth2) {
      googleScriptLoadPromise = null
    }
  })

  return googleScriptLoadPromise
}

const SSOForm = ({ intent, providers, className = "" }: SSOFormProps) => {
  const [pendingProvider, setPendingProvider] = useState<SsoProviderId | null>(null)
  const [ssoError, setSsoError] = useState<string | null>(null)

  const handleGoogleSignIn = async (googleClientId: string) => {
    try {
      await loadGoogleScript()

      if (!window.google?.accounts?.oauth2) {
        throw new Error("Google client did not initialize")
      }

      const handleGoogleCodeResponse = async (response: GoogleCodeClientResponse) => {
        if (!response.code) {
          setPendingProvider(null)
          setSsoError(response.error_description || response.error || "Google sign-in failed")
          return
        }

        try {
          const exchangeResponse = await fetch("/api/auth/sso/google/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code: response.code,
              intent,
            }),
          })

          if (!exchangeResponse.ok) {
            const errorData = (await exchangeResponse.json().catch(() => null)) as {
              error?: string
            } | null
            throw new Error(errorData?.error || "Google sign-in failed")
          }

          const data = (await exchangeResponse.json()) as { redirectTo?: string }
          window.location.assign(data.redirectTo || "/account/dashboard")
        } catch (error) {
          setPendingProvider(null)
          setSsoError(error instanceof Error ? error.message : "Google sign-in failed")
        }
      }

      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: googleClientId,
        scope: "openid email profile",
        ux_mode: "popup",
        callback: (response) => {
          void handleGoogleCodeResponse(response)
        },
      })

      codeClient.requestCode()
    } catch (error) {
      setPendingProvider(null)
      setSsoError(error instanceof Error ? error.message : "Google sign-in failed")
    }
  }

  const handleProviderClick = async (provider: EnabledSsoProvider) => {
    setSsoError(null)
    const providerId = provider.id
    setPendingProvider(providerId)

    if (providerId === "google") {
      if (!provider.googleClientId) {
        setPendingProvider(null)
        setSsoError("Google sign-in is not configured")
        return
      }

      await handleGoogleSignIn(provider.googleClientId)
      return
    }

    const url = new URL(`/api/auth/sso/${providerId}`, window.location.origin)
    url.searchParams.set("intent", intent)

    window.location.assign(url.toString())
  }

  return providers.length > 0 ? (
    <div className={cn("w-full", className)}>
      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span className="bg-background px-3">Or continue with</span>
        </div>
      </div>

      <div className="grid gap-3">
        {providers.map((provider) => {
          const Icon = providerIcons[provider.id]

          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              className="w-full justify-start gap-3"
              disabled={pendingProvider !== null}
              onClick={() => {
                void handleProviderClick(provider)
              }}
            >
              <Icon />
              <span>
                {pendingProvider === provider.id
                  ? `Redirecting to ${provider.label}...`
                  : `${intent === "register" ? "Sign up" : "Sign in"} with ${provider.label}`}
              </span>
            </Button>
          )
        })}
      </div>

      {ssoError ? (
        <p className="mt-3 text-sm text-destructive" role="alert" aria-live="assertive">
          {ssoError}
        </p>
      ) : null}
    </div>
  ) : null
}

export default SSOForm
