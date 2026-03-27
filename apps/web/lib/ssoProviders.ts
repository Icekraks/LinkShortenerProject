const SSO_PROVIDERS = [
  {
    id: "google",
    label: "Google",
  },
  {
    id: "github",
    label: "GitHub",
  },
  {
    id: "microsoft",
    label: "Microsoft",
  },
] as const

export type SsoProviderId = (typeof SSO_PROVIDERS)[number]["id"]
export type SsoIntent = "login" | "register"

export type EnabledSsoProvider = {
  id: SsoProviderId
  label: string
  googleClientId?: string
}

export type GoogleSsoConfig = {
  clientId: string
  clientSecret: string
}

const SSO_PROVIDER_MAP: Record<SsoProviderId, (typeof SSO_PROVIDERS)[number]> = {
  google: SSO_PROVIDERS[0],
  github: SSO_PROVIDERS[1],
  microsoft: SSO_PROVIDERS[2],
}

const SSO_ENTRY_URL_ENV_KEYS: Record<SsoProviderId, string> = {
  google: "SSO_GOOGLE_ENTRY_URL",
  github: "SSO_GITHUB_ENTRY_URL",
  microsoft: "SSO_MICROSOFT_ENTRY_URL",
}

export const isSsoProviderId = (value: string): value is SsoProviderId => value in SSO_PROVIDER_MAP

export const isSsoIntent = (value: string | null | undefined): value is SsoIntent =>
  value === "login" || value === "register"

export const getEnabledSsoProviders = () => {
  return SSO_PROVIDERS.flatMap<EnabledSsoProvider>((provider) => {
    if (provider.id === "google") {
      const googleSsoConfig = getGoogleSsoConfig()

      if (!googleSsoConfig) {
        return []
      }

      return [
        {
          ...provider,
          googleClientId: googleSsoConfig.clientId,
        },
      ]
    }

    if (getSsoEntryUrl(provider.id) === null) {
      return []
    }

    return [provider]
  })
}

export const getSsoEntryUrl = (providerId: SsoProviderId) => {
  const envKey = SSO_ENTRY_URL_ENV_KEYS[providerId]
  const entryUrl = process.env[envKey]?.trim()

  return entryUrl || null
}

export const getGoogleSsoConfig = (): GoogleSsoConfig | null => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    return null
  }

  return {
    clientId,
    clientSecret,
  }
}
