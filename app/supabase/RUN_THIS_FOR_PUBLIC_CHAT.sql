-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR to fix 404 on listing_public_messages
-- Dashboard → SQL Editor → New query → paste and Run
-- ============================================================

-- 1. Create public chat table
CREATE TABLE IF NOT EXISTS listing_public_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_wallet_hash TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS listing_public_messages_listing_idx ON listing_public_messages(listing_id);
CREATE INDEX IF NOT EXISTS listing_public_messages_created_idx ON listing_public_messages(created_at);

ALTER TABLE listing_public_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public chat messages readable by all" ON listing_public_messages;
CREATE POLICY "Public chat messages readable by all"
  ON listing_public_messages FOR SELECT USING (true);

-- No INSERT policy for anon/client: inserts go through API (service role) only
-- DROP the permissive policy if it exists (from older migration)
DROP POLICY IF EXISTS "Public chat messages insert by any user" ON listing_public_messages;

-- 2. Add token-gated columns (encrypted chat)
ALTER TABLE listing_public_messages
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS nonce TEXT;

-- 3. Set $FSBD production mint (so balance check recognizes holdings)
INSERT INTO platform_config (key, value_json) VALUES
  ('fsbd_token_mint', '"A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump"'),
  ('chat_min_tokens', '10000')
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json;
