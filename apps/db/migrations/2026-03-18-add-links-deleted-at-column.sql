-- Adds a soft-delete timestamp for short links.
ALTER TABLE links
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE links
DROP CONSTRAINT IF EXISTS links_short_code_unique;

DROP INDEX IF EXISTS idx_links_deleted_at;
DROP INDEX IF EXISTS idx_links_short_code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_links_short_code_active
ON links(short_code)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_links_active_expires_at
ON links (expires_at)
WHERE deleted_at IS NULL;
