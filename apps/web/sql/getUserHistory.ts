export const GET_USER_HISTORY_QUERY = `
	SELECT id, short_code, original_url, created_at, expires_at
	FROM links
	WHERE user_id = $1
	ORDER BY created_at DESC
	LIMIT 100
`
