-- Digital Assets: NFTs and meme coins with ownership verification
-- Run in Supabase SQL Editor

-- 1. Add digital-assets to category constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_check;
ALTER TABLE listings ADD CONSTRAINT listings_category_check
  CHECK (category IN ('for-sale', 'services', 'gigs', 'housing', 'community', 'jobs', 'digital-assets'));

-- 2. Add asset verification columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_type TEXT CHECK (asset_type IS NULL OR asset_type IN ('nft', 'meme_coin'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_chain TEXT DEFAULT 'solana' CHECK (asset_chain IS NULL OR asset_chain IN ('solana', 'ethereum', 'base', 'arbitrum'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_mint TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS meme_coin_min_percent NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_collection_name TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS asset_image_uri TEXT;

COMMENT ON COLUMN listings.asset_type IS 'nft = verified NFT, meme_coin = verified large % of token supply';
COMMENT ON COLUMN listings.asset_chain IS 'Blockchain where asset lives. Solana supported first.';
COMMENT ON COLUMN listings.asset_mint IS 'NFT mint address or token mint address';
COMMENT ON COLUMN listings.asset_verified_at IS 'When ownership was verified on-chain';
COMMENT ON COLUMN listings.meme_coin_min_percent IS 'Min % of supply held for meme_coin type (e.g. 1 = 1%)';
COMMENT ON COLUMN listings.asset_collection_name IS 'Display name for NFT collection';
COMMENT ON COLUMN listings.asset_image_uri IS 'NFT image URL or token icon';

CREATE INDEX IF NOT EXISTS listings_asset_type_idx ON listings(asset_type) WHERE asset_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS listings_asset_verified_idx ON listings(asset_verified_at) WHERE asset_verified_at IS NOT NULL;
