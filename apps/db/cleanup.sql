WITH deleted AS (
  DELETE FROM links
  WHERE expires_at IS NOT NULL
    AND expires_at <= NOW()
  RETURNING id
)
SELECT COUNT(*) AS deleted_count FROM deleted;
