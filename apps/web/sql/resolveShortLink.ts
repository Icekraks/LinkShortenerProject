export const RESOLVE_SHORT_LINK_QUERY = `
        SELECT original_url
        FROM links
        WHERE short_code = $1
          AND deleted_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `
