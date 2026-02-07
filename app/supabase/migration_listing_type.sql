-- Add listing_type to support token rights listings
-- Values: 'item' (default) | 'token_rights'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'item' CHECK (listing_type IN ('item', 'token_rights'));

-- Index for filtering token_rights listings
CREATE INDEX IF NOT EXISTS listings_listing_type_idx ON listings(listing_type);

COMMENT ON COLUMN listings.listing_type IS 'item: physical/digital item listing; token_rights: listing for pump.fun creator fee rights';
