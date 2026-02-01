-- Local pickup / meet locally + cross-post link
-- Run in Supabase SQL Editor

-- Delivery method: ship, local_pickup, or both
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'ship'
  CHECK (delivery_method IN ('ship', 'local_pickup', 'both'));

-- Approximate location for local pickup (city, region) - we don't store exact addresses
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location_region TEXT;

-- Optional: link to same listing on another platform (user-provided cross-post)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS external_listing_url TEXT;

-- Index for location filtering
CREATE INDEX IF NOT EXISTS listings_delivery_method_idx ON listings(delivery_method);
CREATE INDEX IF NOT EXISTS listings_location_city_idx ON listings(location_city);
CREATE INDEX IF NOT EXISTS listings_location_region_idx ON listings(location_region);
