export const CREATE_LINK_RATE_LIMIT_CHECK_QUERY = `
      WITH inserted AS (
        INSERT INTO rate_limit_events (endpoint, identifier)
        VALUES ($1, $2)
      )
      SELECT COUNT(*)::int AS request_count
      FROM rate_limit_events
      WHERE endpoint = $1
        AND identifier = $2
        AND created_at > NOW() - ($3 * INTERVAL '1 second')
    `;
