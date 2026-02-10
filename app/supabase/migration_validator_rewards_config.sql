-- Validator reward distribution config (adjustable, decay over time)
-- Run in Supabase SQL Editor

-- validator_rewards_config: controls how $FSBD is distributed to validators
-- Adjust these values to slow down or speed up distribution over time
INSERT INTO platform_config (key, value_json) VALUES
  ('validator_rewards_config', '{
    "enabled": false,
    "base_reward_per_job": 10,
    "decay_period_days": 30,
    "decay_percent": 5,
    "start_date": null,
    "min_reward_per_job": 1
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json;
