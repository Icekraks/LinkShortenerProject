import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { dbPool } from "@/lib/db"

type DbQueryable = {
  query: <TRow = unknown>(text: string, params?: readonly unknown[]) => Promise<{ rows: TRow[] }>
}

const EMAIL_VERIFY_PURPOSE = "email_verify"
const PASSWORD_RESET_PURPOSE = "password_reset"

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

const createVerificationToken = async (
  db: DbQueryable,
  {
    userId,
    email,
    ttlMinutes,
    purpose,
  }: {
    userId: string
    email: string
    ttlMinutes: number
    purpose: typeof EMAIL_VERIFY_PURPOSE | typeof PASSWORD_RESET_PURPOSE
  },
) => {
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = hashToken(rawToken)

  await db.query(
    `DELETE FROM auth_verification_tokens
     WHERE purpose = $1
       AND consumed_at IS NULL
       AND (user_id = $2 OR lower(email::text) = lower($3::text))`,
    [purpose, userId, email],
  )

  await db.query(
    `INSERT INTO auth_verification_tokens (user_id, email, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + ($5 * interval '1 minute'))`,
    [userId, email, tokenHash, purpose, ttlMinutes],
  )

  return rawToken
}

export const createEmailVerificationToken = async (
  db: DbQueryable,
  {
    userId,
    email,
    ttlMinutes,
  }: {
    userId: string
    email: string
    ttlMinutes: number
  },
) =>
  createVerificationToken(db, {
    userId,
    email,
    ttlMinutes,
    purpose: EMAIL_VERIFY_PURPOSE,
  })

export const createPasswordResetToken = async (
  db: DbQueryable,
  {
    userId,
    email,
    ttlMinutes,
  }: {
    userId: string
    email: string
    ttlMinutes: number
  },
) =>
  createVerificationToken(db, {
    userId,
    email,
    ttlMinutes,
    purpose: PASSWORD_RESET_PURPOSE,
  })

export const consumeEmailVerificationToken = async (token: string) => {
  const tokenHash = hashToken(token)
  const client = await dbPool.connect()

  try {
    await client.query("BEGIN")

    const tokenResult = await client.query<{
      id: string
      user_id: string | null
      email: string
    }>(
      `SELECT id, user_id, email
       FROM auth_verification_tokens
       WHERE token_hash = $1
         AND purpose = $2
         AND consumed_at IS NULL
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash, EMAIL_VERIFY_PURPOSE],
    )

    const tokenRow = tokenResult.rows[0]

    if (!tokenRow) {
      await client.query("ROLLBACK")
      return { ok: false as const, reason: "invalid_or_expired" as const }
    }

    await client.query(
      `UPDATE users
       SET email_verified = TRUE,
           updated_at = NOW()
       WHERE id = $1
          OR lower(email::text) = lower($2::text)`,
      [tokenRow.user_id, tokenRow.email],
    )

    await client.query(
      `UPDATE auth_verification_tokens
       SET consumed_at = NOW()
       WHERE id = $1`,
      [tokenRow.id],
    )

    await client.query("COMMIT")
    return { ok: true as const }
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
