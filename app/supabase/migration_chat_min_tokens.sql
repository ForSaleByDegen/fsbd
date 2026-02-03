-- Public chat: require 10k $FSBD to post (configurable)
-- Run in Supabase SQL Editor
INSERT INTO platform_config (key, value_json) VALUES
  ('chat_min_tokens', '10000')
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json;
