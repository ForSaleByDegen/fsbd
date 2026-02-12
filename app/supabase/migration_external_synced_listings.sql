-- External synced listings: imported from eBay, Etsy, WooCommerce for hub display
CREATE TABLE IF NOT EXISTS external_synced_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_hash TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ebay','etsy','woocommerce')),
  external_listing_id TEXT NOT NULL,
  external_url TEXT,
  title TEXT,
  description TEXT,
  price_json JSONB,
  images JSONB,
  category TEXT,
  status TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address_hash, platform, external_listing_id)
);

CREATE INDEX IF NOT EXISTS external_synced_listings_wallet_idx ON external_synced_listings (wallet_address_hash);
CREATE INDEX IF NOT EXISTS external_synced_listings_platform_idx ON external_synced_listings (platform);
ALTER TABLE external_synced_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read external_synced_listings" ON external_synced_listings FOR SELECT USING (true);
