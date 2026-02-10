-- Validator rewards ledger: records earned $FSBD per completed job
-- Run in Supabase SQL Editor

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
