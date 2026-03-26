import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

const SESSION_TOKEN_VERSION = "v1"

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

export const createSignedAuthSessionToken = ({
  userId,
  expiresAt,
}: {
  userId: string
  expiresAt: Date
}) => {
  const payload = JSON.stringify({
    sub: userId,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })

  const payloadBase64Url = toBase64Url(payload)
  const signedData = buildSignedData(SESSION_TOKEN_VERSION, payloadBase64Url)
  const signature = buildSignature(signedData)
  return `${SESSION_TOKEN_VERSION}.${payloadBase64Url}.${signature}`
}

export const isSignedAuthSessionTokenValid = (token: string) => {
  const parts = token.split(".")

  if (parts.length !== 3) {
    return false
  }

  const [version, payloadBase64Url, signature] = parts

  if (!version || !payloadBase64Url || !signature) {
    return false
  }

  try {
    const signedData = buildSignedData(version, payloadBase64Url)
    const expectedSignature = buildSignature(signedData)
    const expectedBuffer = Buffer.from(expectedSignature, "utf8")
    const actualBuffer = Buffer.from(signature, "utf8")

    if (expectedBuffer.length !== actualBuffer.length) {
      return false
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
      return false
    }

    if (version !== SESSION_TOKEN_VERSION) {
      return false
    }

    const payloadJson = fromBase64Url(payloadBase64Url)
    const payload = JSON.parse(payloadJson) as { sub?: unknown; exp?: unknown }

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return false
    }

    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}
