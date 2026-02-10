-- Enable validator rewards ledger so completions are logged and total_earned updates.
-- Run in Supabase SQL Editor when ready to start rewarding validators.

-- Ensure config exists, then set enabled = true
INSERT INTO platform_config (key, value_json, updated_at)
VALUES (
  'validator_rewards_config',
  '{"enabled":true,"base_reward_per_job":25,"decay_period_days":30,"decay_percent":5,"start_date":null,"min_reward_per_job":1,"payout_min_accumulated":100,"payout_schedule":"weekly"}'::jsonb,
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value_json = jsonb_set(
    COALESCE(platform_config.value_json, '{}'::jsonb),
    '{enabled}',
    'true'::jsonb
  ),
  updated_at = now();
