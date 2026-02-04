-- Vanity address pool: store donated keypairs for reuse when users create listings without tokens
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS vanity_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key TEXT NOT NULL,
  secret_key_encrypted TEXT NOT NULL,
  suffix TEXT NOT NULL DEFAULT 'pump',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vanity_pool_suffix ON vanity_pool(suffix);
CREATE INDEX IF NOT EXISTS idx_vanity_pool_created ON vanity_pool(created_at);

COMMENT ON TABLE vanity_pool IS 'Pool of donated vanity addresses for token mints. Donated when user creates listing without token but had one ready.';

-- RLS: no direct client access; only service role (API) can read/write
ALTER TABLE vanity_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON vanity_pool FOR ALL USING (false);
