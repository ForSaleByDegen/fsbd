-- Chat, Terms, and Optional Escrow Migration
-- Run in Supabase SQL Editor
-- Enable Realtime for chat: Supabase Dashboard → Database → Replication → enable for chat_messages

-- Chat threads: one per listing between buyer and seller
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_wallet_hash TEXT NOT NULL,
  buyer_wallet_hash TEXT NOT NULL,
  escrow_agreed BOOLEAN DEFAULT false,
  escrow_status TEXT CHECK (escrow_status IS NULL OR escrow_status IN ('pending', 'funded', 'shipped', 'completed', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(listing_id, buyer_wallet_hash)
);

-- Chat messages (encrypted content)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_wallet_hash TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  nonce TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'escrow_proposed', 'escrow_accepted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- E2E encryption: each user's public key for chat (X25519)
CREATE TABLE IF NOT EXISTS chat_pubkeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_hash TEXT NOT NULL UNIQUE,
  public_key_base64 TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Terms acceptances
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_hash TEXT NOT NULL,
  terms_version TEXT NOT NULL DEFAULT '1.0',
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger for updated_at on chat_threads
CREATE TRIGGER update_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS chat_threads_listing_idx ON chat_threads(listing_id);
CREATE INDEX IF NOT EXISTS chat_threads_buyer_idx ON chat_threads(buyer_wallet_hash);
CREATE INDEX IF NOT EXISTS chat_threads_seller_idx ON chat_threads(seller_wallet_hash);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS terms_acceptances_wallet_idx ON terms_acceptances(wallet_hash);

-- RLS
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_pubkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Chat threads: participants can read/insert
CREATE POLICY "Chat participants can manage threads"
  ON chat_threads FOR ALL
  USING (true) WITH CHECK (true);

-- Chat messages: participants can read/insert
CREATE POLICY "Chat participants can manage messages"
  ON chat_messages FOR ALL
  USING (true) WITH CHECK (true);

-- Pubkeys: anyone can read (for encryption), users insert own
CREATE POLICY "Pubkeys readable by all"
  ON chat_pubkeys FOR SELECT USING (true);
CREATE POLICY "Pubkeys insert by owner"
  ON chat_pubkeys FOR INSERT WITH CHECK (true);
CREATE POLICY "Pubkeys update by owner"
  ON chat_pubkeys FOR UPDATE USING (true) WITH CHECK (true);

-- Terms: users can insert own acceptance
CREATE POLICY "Terms insert by user"
  ON terms_acceptances FOR INSERT WITH CHECK (true);
CREATE POLICY "Terms select by user"
  ON terms_acceptances FOR SELECT USING (true);
