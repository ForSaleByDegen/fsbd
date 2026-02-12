-- Add cross-post columns to listings for marketplace sync status
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cross_post_platforms JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS external_sync_status JSONB;

COMMENT ON COLUMN listings.cross_post_platforms IS 'Platforms to cross-post to: e.g. ["ebay","etsy"]';
COMMENT ON COLUMN listings.external_sync_status IS 'Per-platform sync status: e.g. {"ebay":"synced","etsy":"pending"}';
