-- Add receipt_asset_id for cNFT receipt on purchase
ALTER TABLE listings ADD COLUMN IF NOT EXISTS receipt_asset_id TEXT;
