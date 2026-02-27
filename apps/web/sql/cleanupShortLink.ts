export const DELETE_EXPIRED_LINKS_QUERY = `WITH deleted AS (
  DELETE FROM links
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW()
  RETURNING id
)
SELECT COUNT(*)::int AS deleted_count FROM deleted;`

export const DELETE_OLD_RATE_LIMIT_EVENTS_QUERY = `WITH deleted AS (
  DELETE FROM rate_limit_events
  WHERE created_at < NOW() - INTERVAL '7 days'
  RETURNING id
)
SELECT COUNT(*)::int AS deleted_count FROM deleted;`
