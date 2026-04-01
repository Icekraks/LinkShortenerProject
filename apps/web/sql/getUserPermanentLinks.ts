export const GET_USER_PERMANENT_LINKS_QUERY = `
	SELECT id, short_code, original_url, created_at, expires_at
	FROM links
	WHERE user_id = $1
		AND deleted_at IS NULL
		AND expires_at IS NULL
	ORDER BY created_at DESC
	LIMIT 100
`

export const SOFT_DELETE_USER_PERMANENT_LINK_QUERY = `
	UPDATE links
	SET expires_at = NOW()
	WHERE id = $1
		AND user_id = $2
		AND deleted_at IS NULL
		AND expires_at IS NULL
	RETURNING id
`
