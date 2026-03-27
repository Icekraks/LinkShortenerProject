import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import type { SsoIntent, SsoProviderId } from "@/lib/ssoProviders"

const SSO_STATE_TOKEN_VERSION = "v1"

export const SSO_STATE_COOKIE_NAME = "link_shortener_sso_state"

type SsoStatePayload = {
  provider: SsoProviderId
  state: string
  intent: SsoIntent
  returnTo: string
  exp: number
}

const getSessionSecret = () => {
  const envSecret = process.env.AUTH_SESSION_SECRET?.trim()

  if (envSecret) {
    return envSecret
  }

  throw new Error("AUTH_SESSION_SECRET is required")
}

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url")

const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8")

const buildSignedData = (version: string, payloadBase64Url: string) =>
  `${version}.${payloadBase64Url}`

const buildSignature = (signedData: string) => {
  const secret = getSessionSecret()
  return createHmac("sha256", secret).update(signedData).digest("base64url")
}

export const createSignedSsoStateValue = ({
  provider,
  state,
  intent,
  returnTo,
  expiresAt,
}: {
  provider: SsoProviderId
  state: string
  intent: SsoIntent
  returnTo: string
  expiresAt: Date
}) => {
  const payload = JSON.stringify({
    provider,
    state,
    intent,
    returnTo,
    exp: Math.floor(expiresAt.getTime() / 1000),
  } satisfies SsoStatePayload)

  const payloadBase64Url = toBase64Url(payload)
  const signedData = buildSignedData(SSO_STATE_TOKEN_VERSION, payloadBase64Url)
  const signature = buildSignature(signedData)

  return `${SSO_STATE_TOKEN_VERSION}.${payloadBase64Url}.${signature}`
}

export const readSignedSsoStateValue = (value: string) => {
  const parts = value.split(".")

  if (parts.length !== 3) {
    return null
  }

  const [version, payloadBase64Url, signature] = parts

  if (!version || !payloadBase64Url || !signature) {
    return null
  }

  try {
    const signedData = buildSignedData(version, payloadBase64Url)
    const expectedSignature = buildSignature(signedData)
    const expectedBuffer = Buffer.from(expectedSignature, "utf8")
    const actualBuffer = Buffer.from(signature, "utf8")

    if (expectedBuffer.length !== actualBuffer.length) {
      return null
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null
    }

    if (version !== SSO_STATE_TOKEN_VERSION) {
      return null
    }

    const payloadJson = fromBase64Url(payloadBase64Url)
    const payload = JSON.parse(payloadJson) as Partial<SsoStatePayload>

    if (
      typeof payload.provider !== "string" ||
      typeof payload.state !== "string" ||
      typeof payload.intent !== "string" ||
      typeof payload.returnTo !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload as SsoStatePayload
  } catch {
    return null
  }
}
