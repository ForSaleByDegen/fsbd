-- Validator rewards v2: tiered rewards, verification rewards, lottery
-- Run in Supabase SQL Editor

-- 1. Add reward_type to validator_rewards_ledger
ALTER TABLE validator_rewards_ledger ADD COLUMN IF NOT EXISTS reward_type TEXT DEFAULT 'primary';
DO $$ BEGIN
  ALTER TABLE validator_rewards_ledger ADD CONSTRAINT validator_rewards_type_check
    CHECK (reward_type IN ('primary', 'verification', 'lottery'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Allow job_id to be null for lottery (no specific job)
ALTER TABLE validator_rewards_ledger ALTER COLUMN job_id DROP NOT NULL;

-- 3. Extend platform_config with new validator_rewards_config fields
-- (handled in app; migration just documents the schema)
-- primary_reward_share: 0.75
-- verifier_reward_share: 0.25
-- lottery_interval: 10
-- lottery_bonus_multiplier: 2
