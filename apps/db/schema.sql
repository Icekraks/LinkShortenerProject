CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  short_code TEXT NOT NULL,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT links_short_code_unique UNIQUE (short_code),
  CONSTRAINT links_short_code_format CHECK (short_code ~ '^[a-z0-9]{4,}$')
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links (expires_at);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint_identifier_created_at
  ON rate_limit_events (endpoint, identifier, created_at DESC);
