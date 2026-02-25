CREATE OR REPLACE FUNCTION to_base62(value BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  num BIGINT := value;
  output TEXT := '';
  remainder INTEGER;
BEGIN
  IF num < 0 THEN
    RAISE EXCEPTION 'to_base62 only supports non-negative values';
  END IF;

  IF num = 0 THEN
    RETURN '0';
  END IF;

  WHILE num > 0 LOOP
    remainder := (num % 62)::INTEGER;
    output := substr(alphabet, remainder + 1, 1) || output;
    num := num / 62;
  END LOOP;

  RETURN output;
END;
$$;

CREATE TABLE IF NOT EXISTS links (
  id BIGSERIAL PRIMARY KEY,
  short_code CHAR(4) GENERATED ALWAYS AS (lpad(to_base62(id), 4, '0')) STORED,
  original_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT links_short_code_unique UNIQUE (short_code),
  CONSTRAINT links_id_base62_4char_limit CHECK (id < 14776336)
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links (expires_at);
