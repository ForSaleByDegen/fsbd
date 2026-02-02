-- Public chat per listing - community discussion (unencrypted, anyone can read/post)
-- Run in Supabase SQL Editor after migration_chat.sql
-- Optional: Enable Realtime for live updates: Database → Replication → add listing_public_messages

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

-- Anyone can read public messages for a listing
DROP POLICY IF EXISTS "Public chat messages readable by all" ON listing_public_messages;
CREATE POLICY "Public chat messages readable by all"
  ON listing_public_messages FOR SELECT USING (true);

-- Authenticated users (anyone with wallet) can insert
DROP POLICY IF EXISTS "Public chat messages insert by any user" ON listing_public_messages;
CREATE POLICY "Public chat messages insert by any user"
  ON listing_public_messages FOR INSERT WITH CHECK (true);

-- No update/delete for public chat (immutable once posted)
COMMENT ON TABLE listing_public_messages IS 'Public community chat per listing - unencrypted, visible to all';
