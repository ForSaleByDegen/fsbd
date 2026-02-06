-- Digital Assets: add token, whole_token, wallet types
-- Run after migration_digital_assets.sql

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_asset_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_asset_type_check
  CHECK (asset_type IS NULL OR asset_type IN ('nft', 'meme_coin', 'token', 'whole_token', 'wallet'));
