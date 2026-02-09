-- AI Validator Pool: staked validators for in-house vision AI
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  stake_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_health_at TIMESTAMPTZ,
  CONSTRAINT ai_validators_status_check CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- RLS: public read for active validators
ALTER TABLE ai_validators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active validators"
  ON ai_validators FOR SELECT
  USING (status = 'active');

-- Inserts/updates done via API with service role (no direct client writes)

-- Index for status lookups
CREATE INDEX IF NOT EXISTS ai_validators_status_idx ON ai_validators (status);

-- Whitelist: platform_config key for validator access
INSERT INTO platform_config (key, value_json) VALUES
  ('ai_validators_whitelist', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
