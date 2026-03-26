export const DELETE_EXPIRED_LINKS_QUERY = `WITH deleted AS (
  UPDATE links
  SET deleted_at = NOW()
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW()
    AND deleted_at IS NULL
  RETURNING id
)
SELECT COUNT(*)::int AS deleted_count FROM deleted;`

export const DELETE_OLD_RATE_LIMIT_EVENTS_QUERY = `WITH deleted AS (
  DELETE FROM rate_limit_events
  WHERE created_at < NOW() - INTERVAL '7 days'
  RETURNING id
)
SELECT COUNT(*)::int AS deleted_count FROM deleted;`

export const DELETE_EXPIRED_VERIFICATION_TOKENS_QUERY = `WITH deleted AS (
  DELETE FROM auth_verification_tokens
  WHERE expires_at <= NOW()
    OR (consumed_at IS NOT NULL AND created_at < NOW() - INTERVAL '30 days')
  RETURNING id
)
SELECT COUNT(*)::int AS deleted_count FROM deleted;`
