WITH deleted AS (
  UPDATE links
  SET deleted_at = NOW()
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW()
    AND deleted_at IS NULL
  RETURNING id
)
SELECT COUNT(*) AS deleted_count FROM deleted;

DELETE FROM rate_limit_events
WHERE created_at < NOW() - INTERVAL '7 days';
