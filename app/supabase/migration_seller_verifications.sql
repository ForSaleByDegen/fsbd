-- Seller verifications: OAuth (eBay, Etsy, Amazon) or manual code verification
-- Used to show verified seller badge and prove ownership of external listings
CREATE TABLE IF NOT EXISTS seller_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address_hash TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ebay','etsy','amazon','manual')),
  platform_user_id TEXT,
  platform_username TEXT,
  store_url TEXT,
  verified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seller_verifications_wallet_platform_idx
  ON seller_verifications(wallet_address_hash, platform);
CREATE INDEX IF NOT EXISTS seller_verifications_wallet_idx ON seller_verifications(wallet_address_hash);

COMMENT ON TABLE seller_verifications IS 'Seller ownership verification for external platforms; enables verified badge';

-- Enable RLS; service role (API) bypasses for all operations.
ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

-- Allow public read (verification status is non-sensitive, shown on listings). Writes only via service role.
CREATE POLICY "Allow public read seller_verifications"
  ON seller_verifications FOR SELECT
  USING (true);
