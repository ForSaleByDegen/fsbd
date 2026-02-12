-- Validator: run all migrations in order
-- Run in Supabase SQL Editor

-- 0a. platform_config (required for whitelist)
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_by_hash TEXT
);
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public can read platform config" ON platform_config FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 0b. ai_validators (base table)
CREATE TABLE IF NOT EXISTS ai_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  endpoint_url TEXT,
  stake_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  validator_type TEXT NOT NULL DEFAULT 'endpoint',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_health_at TIMESTAMPTZ,
  CONSTRAINT ai_validators_status_check CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT ai_validators_type_check CHECK (validator_type IN ('endpoint', 'browser'))
);
ALTER TABLE ai_validators ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Public can read active validators" ON ai_validators FOR SELECT USING (status = 'active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS ai_validators_status_idx ON ai_validators (status);
INSERT INTO platform_config (key, value_json) VALUES ('ai_validators_whitelist', '[]'::jsonb) ON CONFLICT (key) DO NOTHING;

-- 1. validator_jobs

CREATE TABLE IF NOT EXISTS validator_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_base64 TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  validator_wallet TEXT,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT validator_jobs_status_check CHECK (status IN ('pending', 'claimed', 'completed', 'timeout'))
);
CREATE INDEX IF NOT EXISTS validator_jobs_status_idx ON validator_jobs (status);
CREATE INDEX IF NOT EXISTS validator_jobs_created_idx ON validator_jobs (created_at);
ALTER TABLE validator_jobs ENABLE ROW LEVEL SECURITY;

-- 2. validator_rewards_ledger
CREATE TABLE IF NOT EXISTS validator_rewards_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validator_wallet TEXT NOT NULL,
  job_id UUID NOT NULL REFERENCES validator_jobs(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT validator_rewards_status_check CHECK (status IN ('pending', 'paid', 'failed'))
);
CREATE INDEX IF NOT EXISTS validator_rewards_ledger_wallet_idx ON validator_rewards_ledger (validator_wallet);
CREATE INDEX IF NOT EXISTS validator_rewards_ledger_status_idx ON validator_rewards_ledger (status);
ALTER TABLE validator_rewards_ledger ENABLE ROW LEVEL SECURITY;

-- 3. validator_rewards_v2 (reward_type, nullable job_id)
ALTER TABLE validator_rewards_ledger ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'primary';
DO $$ BEGIN
  ALTER TABLE validator_rewards_ledger ADD CONSTRAINT validator_rewards_type_check
    CHECK (reward_type IN ('primary', 'verification', 'lottery'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE validator_rewards_ledger ALTER COLUMN job_id DROP NOT NULL;

-- 4. validator_verification_jobs
CREATE TABLE IF NOT EXISTS validator_verification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES validator_jobs(id) ON DELETE CASCADE,
  verifier_wallet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT validator_verification_status_check CHECK (status IN ('pending', 'claimed', 'completed', 'timeout'))
);
CREATE INDEX IF NOT EXISTS validator_verification_jobs_status_idx ON validator_verification_jobs (status);
CREATE INDEX IF NOT EXISTS validator_verification_jobs_job_id_idx ON validator_verification_jobs (job_id);
ALTER TABLE validator_verification_jobs ENABLE ROW LEVEL SECURITY;
