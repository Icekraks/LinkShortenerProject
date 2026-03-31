


ALTER TABLE links
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_links_user_id_created_at_active
  ON links (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
