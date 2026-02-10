-- Set minimum validator stake to 10,000,000 $FSBD
-- Run in Supabase SQL Editor

INSERT INTO platform_config (key, value_json, updated_at)
VALUES ('min_validator_stake', '10000000'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value_json = '10000000'::jsonb, updated_at = now();
