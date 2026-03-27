import "server-only"

import { Resend } from "resend"

let resendClient: Resend | null = null

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim()

  if (!apiKey) {
    return null
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }

  return resendClient
}

export const sendEmailVerificationEmail = async ({
  to,
  verificationUrl,
}: {
  to: string
  verificationUrl: string
}) => {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const client = getResendClient()

  if (!client || !from) {
    return { sent: false as const, skipped: true as const }
  }

  try {
    const response = await client.emails.send({
      from,
      to,
      subject: "Verify your email",
      text: `Verify your email by opening this link: ${verificationUrl}`,
      html: `<p>Welcome to SniprUrl Link Shortener.</p><p>Please verify your email by clicking <a href="${verificationUrl}">this link</a>.</p><p>If you did not create an account, you can ignore this email.</p>`,
    })

    if (response.error) {
      console.error("Failed to send email:", response.error)
      return { sent: false as const, skipped: false as const }
    }

    return { sent: true as const, skipped: false as const }
  } catch (error) {
    console.error("Failed to send verification email", error)
    return { sent: false as const, skipped: false as const }
  }
}

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
}: {
  to: string
  resetUrl: string
}) => {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const client = getResendClient()

  if (!client || !from) {
    return { sent: false as const, skipped: true as const }
  }

  try {
    const response = await client.emails.send({
      from,
      to,
      subject: "Reset your password",
      text: `Reset your password by opening this link: ${resetUrl}`,
      html: `<p>We received a request to reset your password.</p><p>You can set a new password by clicking <a href="${resetUrl}">this link</a>.</p><p>If you did not request a password reset, you can ignore this email.</p>`,
    })

    if (response.error) {
      console.error("Failed to send email:", response.error)
      return { sent: false as const, skipped: false as const }
    }

    return { sent: true as const, skipped: false as const }
  } catch (error) {
    console.error("Failed to send password reset email", error)
    return { sent: false as const, skipped: false as const }
  }
}

export const sendSsoLoginHintEmail = async ({
  to,
  loginUrl,
  providers,
}: {
  to: string
  loginUrl: string
  providers: string[]
}) => {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const client = getResendClient()

  if (!client || !from) {
    return { sent: false as const, skipped: true as const }
  }

  const providerText = providers.length > 0 ? providers.join(", ") : "a social login provider"

  try {
    const response = await client.emails.send({
      from,
      to,
      subject: "Use social sign-in for your account",
      text: `This account signs in with ${providerText}. Open this link to continue: ${loginUrl}`,
      html: `<p>We received a password reset request for your account.</p><p>This account signs in with ${providerText}, so there is no password to reset.</p><p>Please continue from the login page and choose your social sign-in provider: <a href="${loginUrl}">Sign in</a>.</p>`,
    })

    if (response.error) {
      console.error("Failed to send email:", response.error)
      return { sent: false as const, skipped: false as const }
    }

    return { sent: true as const, skipped: false as const }
  } catch (error) {
    console.error("Failed to send SSO login hint email", error)
    return { sent: false as const, skipped: false as const }
  }
}
