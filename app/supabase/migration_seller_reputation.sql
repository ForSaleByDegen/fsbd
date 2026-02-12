-- Seller reputation: aggregated ratings across FSBD, eBay, Etsy for hub display
CREATE TABLE IF NOT EXISTS seller_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_hash TEXT NOT NULL UNIQUE,
  fsbd_rating_avg NUMERIC,
  fsbd_review_count INTEGER DEFAULT 0,
  ebay_rating_avg NUMERIC,
  ebay_feedback_count INTEGER DEFAULT 0,
  etsy_rating_avg NUMERIC,
  etsy_review_count INTEGER DEFAULT 0,
  combined_score NUMERIC,
  platforms_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seller_reputation_wallet_idx ON seller_reputation (wallet_address_hash);
COMMENT ON TABLE seller_reputation IS 'Aggregated seller ratings from FSBD, eBay, Etsy for hub badge display';

ALTER TABLE seller_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read seller_reputation" ON seller_reputation FOR SELECT USING (true);
