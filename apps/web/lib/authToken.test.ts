import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"

import {
  createSignedAuthSessionToken,
  isSignedAuthSessionTokenValid,
} from "@/lib/authToken"

describe("authToken", () => {
  const originalAuthSessionSecret = process.env.AUTH_SESSION_SECRET

  beforeEach(() => {
    process.env.AUTH_SESSION_SECRET = "test-auth-session-secret"
  })

  afterEach(() => {
    if (originalAuthSessionSecret === undefined) {
      delete process.env.AUTH_SESSION_SECRET
      return
    }

    process.env.AUTH_SESSION_SECRET = originalAuthSessionSecret
  })

  it("accepts a valid signed session token", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const token = createSignedAuthSessionToken({ userId: "user-1", expiresAt })

    expect(isSignedAuthSessionTokenValid(token)).toBe(true)
  })

  it("rejects token if version segment is tampered", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const token = createSignedAuthSessionToken({ userId: "user-1", expiresAt })
    const [, payloadBase64Url, signature] = token.split(".")

    const tamperedToken = `v2.${payloadBase64Url}.${signature}`

    expect(isSignedAuthSessionTokenValid(tamperedToken)).toBe(false)
  })

  it("rejects legacy payload-only signatures", () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    const payload = JSON.stringify({
      sub: "user-1",
      exp: Math.floor(expiresAt.getTime() / 1000),
    })
    const payloadBase64Url = Buffer.from(payload, "utf8").toString("base64url")

    // Legacy token format signed only the payload segment.
    const legacySignature = createHmac("sha256", process.env.AUTH_SESSION_SECRET as string)
      .update(payloadBase64Url)
      .digest("base64url")

    const legacyToken = `v1.${payloadBase64Url}.${legacySignature}`

    expect(isSignedAuthSessionTokenValid(legacyToken)).toBe(false)
  })

  it("rejects expired tokens", () => {
    const expiresAt = new Date(Date.now() - 1000)
    const token = createSignedAuthSessionToken({ userId: "user-1", expiresAt })

    expect(isSignedAuthSessionTokenValid(token)).toBe(false)
  })
})
