export const ALLOCATE_NEXT_LINK_ID_QUERY =
  "SELECT nextval(pg_get_serial_sequence('links', 'id')) AS id";

export const INSERT_SHORT_LINK_WITH_CODE_QUERY = `
        INSERT INTO links (id, short_code, original_url, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, short_code, original_url, created_at, expires_at
      `;
