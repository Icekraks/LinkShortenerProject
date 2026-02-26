export const RESOLVE_SHORT_LINK_QUERY = `
        SELECT original_url
        FROM links
        WHERE short_code = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `;
