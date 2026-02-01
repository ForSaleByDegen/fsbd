-- Honor system: buyer confirm receipt, seller feedback, public stats
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Add buyer_confirmed_received_at to listings (when buyer checks "I received")
ALTER TABLE listings ADD COLUMN IF NOT EXISTS buyer_confirmed_received_at TIMESTAMP WITH TIME ZONE;

-- 2. Add total_confirmed_received to profiles (successful deliveries)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_confirmed_received INTEGER DEFAULT 0;

-- 3. Seller feedback table (buyer leaves feedback about seller)
CREATE TABLE IF NOT EXISTS seller_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id),
  seller_wallet_hash TEXT NOT NULL,
  buyer_wallet_hash TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(listing_id, buyer_wallet_hash)
);

CREATE INDEX IF NOT EXISTS seller_feedback_seller_idx ON seller_feedback(seller_wallet_hash);
CREATE INDEX IF NOT EXISTS seller_feedback_listing_idx ON seller_feedback(listing_id);

-- Enable RLS (use service role for inserts/updates via API)
ALTER TABLE seller_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public read for seller stats (anyone can see feedback)
DROP POLICY IF EXISTS "Public can read seller feedback" ON seller_feedback;
CREATE POLICY "Public can read seller feedback"
  ON seller_feedback FOR SELECT
  USING (true);
