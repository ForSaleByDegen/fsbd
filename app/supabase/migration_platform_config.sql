-- Admin-configurable platform settings (tier thresholds, auction gate)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by_hash TEXT
);

-- RLS: public read, admin write via API (service role)
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (used by frontend)
CREATE POLICY "Public can read platform config"
  ON platform_config FOR SELECT
  USING (true);

-- Inserts/updates done via API with service role (no direct client writes)

-- Default values
INSERT INTO platform_config (key, value_json) VALUES
  ('auction_min_tokens', '10000000'),
  ('tier_bronze', '100000'),
  ('tier_silver', '1000000'),
  ('tier_gold', '10000000')
ON CONFLICT (key) DO NOTHING;
