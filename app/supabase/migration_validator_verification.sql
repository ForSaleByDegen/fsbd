-- Validator verification jobs: async background verification by other validators
-- Run in Supabase SQL Editor

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
