-- Add quantity support for multiple units per listing
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
COMMENT ON COLUMN listings.quantity IS 'Number of units available. Decremented on purchase. When 0, listing is sold.';
