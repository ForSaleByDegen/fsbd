-- Subcategories for listings - break down categories as marketplace grows
-- Run in Supabase SQL Editor

ALTER TABLE listings ADD COLUMN IF NOT EXISTS subcategory TEXT;

CREATE INDEX IF NOT EXISTS listings_subcategory_idx ON listings(subcategory);

-- Composite for category+subcategory filtering
CREATE INDEX IF NOT EXISTS listings_category_subcategory_idx ON listings(category, subcategory);
