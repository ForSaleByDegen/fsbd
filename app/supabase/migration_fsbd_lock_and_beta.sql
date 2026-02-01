-- Lock in $FSBD token mint and tier thresholds (admin-configurable)
-- Beta signup waitlist for launch
-- Run in Supabase SQL Editor

-- Add fsbd_token_mint to platform_config (set after token launch)
INSERT INTO platform_config (key, value_json) VALUES
  ('fsbd_token_mint', '"FSBD_TOKEN_MINT_PLACEHOLDER"')
ON CONFLICT (key) DO NOTHING;

-- Beta signups: wallet addresses for launch waitlist
CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  wallet_address_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS beta_signups_wallet_hash_idx ON beta_signups(wallet_address_hash);
CREATE INDEX IF NOT EXISTS beta_signups_created_at_idx ON beta_signups(created_at DESC);

ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (sign up), no one can read (privacy)
CREATE POLICY "Anyone can sign up for beta"
  ON beta_signups FOR INSERT
  WITH CHECK (true);

-- No SELECT for anon - admin uses service role to export list
