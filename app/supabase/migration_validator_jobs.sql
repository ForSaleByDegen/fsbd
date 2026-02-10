-- Validator job queue for browser-based validators (pull model)
-- Run in Supabase SQL Editor

-- 1. Add validator_type to ai_validators (endpoint | browser)
ALTER TABLE ai_validators ADD COLUMN IF NOT EXISTS validator_type TEXT DEFAULT 'endpoint';
UPDATE ai_validators SET validator_type = 'endpoint' WHERE validator_type IS NULL;
ALTER TABLE ai_validators ALTER COLUMN validator_type SET DEFAULT 'endpoint';
ALTER TABLE ai_validators ALTER COLUMN validator_type SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE ai_validators ADD CONSTRAINT ai_validators_type_check CHECK (validator_type IN ('endpoint', 'browser'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Allow endpoint_url to be null for browser validators
ALTER TABLE ai_validators ALTER COLUMN endpoint_url DROP NOT NULL;

-- 3. validator_jobs: pending jobs for browser validators to claim
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

-- RLS: service role only (no direct client access)
ALTER TABLE validator_jobs ENABLE ROW LEVEL SECURITY;
