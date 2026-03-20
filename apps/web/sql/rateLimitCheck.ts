export const RATE_LIMIT_CHECK_QUERY = `
      WITH inserted AS (
        INSERT INTO rate_limit_events (endpoint, identifier)
        VALUES ($1, $2)
        RETURNING 1
      )
      SELECT (
        SELECT COUNT(*)::int
        FROM rate_limit_events
        WHERE endpoint = $1
          AND identifier = $2
          AND created_at > NOW() - ($3 * INTERVAL '1 second')
      ) + (
        SELECT COUNT(*)::int
        FROM inserted
      ) AS request_count
    `
