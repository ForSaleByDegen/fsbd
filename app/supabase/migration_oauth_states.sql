-- OAuth state storage for eBay/Etsy verification flows (CSRF protection)
-- state is the PK; we look up wallet + code_verifier on callback
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  wallet_address_hash TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ebay','etsy')),
  code_verifier TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_states_expires_idx ON oauth_states(expires_at);

COMMENT ON TABLE oauth_states IS 'Temporary OAuth state for seller verification flows; cleaned up after use or expiry';

ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- No public access; only service role (API) can read/write
CREATE POLICY "Service role only oauth_states"
  ON oauth_states FOR ALL
  USING (false)
  WITH CHECK (false);
