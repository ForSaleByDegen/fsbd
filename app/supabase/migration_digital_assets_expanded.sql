-- Digital Assets: add token, whole_token, wallet types
-- Run this even if migration_digital_assets.sql wasn't run (creates column if needed)

-- 1. Ensure category constraint includes digital-assets
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('for-sale', 'services', 'gigs', 'housing', 'community', 'jobs', 'digital-assets'));

-- 2. Add asset columns if they don't exist (from base migration)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_chain TEXT DEFAULT 'solana';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_mint TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS meme_coin_min_percent NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_collection_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_image_uri TEXT;

-- 3. Update asset_type constraint to allow token, whole_token, wallet
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_asset_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_asset_type_check
  CHECK (asset_type IS NULL OR asset_type IN ('nft', 'meme_coin', 'token', 'whole_token', 'wallet'));
