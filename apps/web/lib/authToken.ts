import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

const SESSION_TOKEN_VERSION = "v1"

const getSessionSecret = () => {
  const envSecret = process.env.AUTH_SESSION_SECRET?.trim()

  if (envSecret) {
    return envSecret
  }

  throw new Error("AUTH_SESSION_SECRET is required in production")
}

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url")

const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8")

const buildSignature = (payloadBase64Url: string) => {
  const secret = getSessionSecret()
  return createHmac("sha256", secret).update(payloadBase64Url).digest("base64url")
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
  const signature = buildSignature(payloadBase64Url)
  return `${SESSION_TOKEN_VERSION}.${payloadBase64Url}.${signature}`
}

export const isSignedAuthSessionTokenValid = (token: string) => {
  const parts = token.split(".")

  if (parts.length !== 3) {
    return false
  }

  const [version, payloadBase64Url, signature] = parts

  if (version !== SESSION_TOKEN_VERSION || !payloadBase64Url || !signature) {
    return false
  }

  try {
    const expectedSignature = buildSignature(payloadBase64Url)
    const expectedBuffer = Buffer.from(expectedSignature, "utf8")
    const actualBuffer = Buffer.from(signature, "utf8")

    if (expectedBuffer.length !== actualBuffer.length) {
      return false
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
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
