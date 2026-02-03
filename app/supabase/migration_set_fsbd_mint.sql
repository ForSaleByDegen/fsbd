-- Set $FSBD production token mint (pump.fun)
-- Run in Supabase SQL Editor if balance check still shows 0
INSERT INTO platform_config (key, value_json) VALUES
  ('fsbd_token_mint', '"A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump"')
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json;
