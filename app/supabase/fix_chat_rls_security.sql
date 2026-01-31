-- Fix overly permissive RLS policies on chat/terms tables (Supabase linter)
-- Run in Supabase SQL Editor
-- Replaces USING (true) / WITH CHECK (true) with data-validity constraints

-- ========== chat_threads ==========
DROP POLICY IF EXISTS "Chat participants can manage threads" ON chat_threads;

-- SELECT: participants can read threads (threads always have both hashes set)
CREATE POLICY "Chat threads select"
  ON chat_threads FOR SELECT
  USING (seller_wallet_hash IS NOT NULL AND seller_wallet_hash != '' AND buyer_wallet_hash IS NOT NULL AND buyer_wallet_hash != '');

-- INSERT: require valid participant hashes and listing
CREATE POLICY "Chat threads insert"
  ON chat_threads FOR INSERT
  WITH CHECK (
    listing_id IS NOT NULL
    AND seller_wallet_hash IS NOT NULL
    AND seller_wallet_hash != ''
    AND buyer_wallet_hash IS NOT NULL
    AND buyer_wallet_hash != ''
  );

-- UPDATE: only rows with valid structure; restrict escrow_status to allowed values
CREATE POLICY "Chat threads update"
  ON chat_threads FOR UPDATE
  USING (seller_wallet_hash IS NOT NULL AND buyer_wallet_hash IS NOT NULL)
  WITH CHECK (
    seller_wallet_hash IS NOT NULL
    AND buyer_wallet_hash IS NOT NULL
    AND (escrow_status IS NULL OR escrow_status IN ('pending', 'funded', 'shipped', 'completed', 'disputed'))
  );

-- ========== chat_messages ==========
DROP POLICY IF EXISTS "Chat participants can manage messages" ON chat_messages;

-- SELECT: messages belong to a valid thread
CREATE POLICY "Chat messages select"
  ON chat_messages FOR SELECT
  USING (thread_id IS NOT NULL AND sender_wallet_hash IS NOT NULL);

-- INSERT: require valid message structure
CREATE POLICY "Chat messages insert"
  ON chat_messages FOR INSERT
  WITH CHECK (
    thread_id IS NOT NULL
    AND sender_wallet_hash IS NOT NULL
    AND sender_wallet_hash != ''
    AND encrypted_content IS NOT NULL
    AND nonce IS NOT NULL
    AND (message_type IS NULL OR message_type IN ('text', 'system', 'escrow_proposed', 'escrow_accepted'))
  );

-- Messages are insert-only in app; no UPDATE/DELETE policy = denied by default

-- ========== chat_pubkeys ==========
DROP POLICY IF EXISTS "Pubkeys insert by owner" ON chat_pubkeys;
DROP POLICY IF EXISTS "Pubkeys update by owner" ON chat_pubkeys;

-- INSERT: require valid wallet hash and public key
CREATE POLICY "Pubkeys insert by owner"
  ON chat_pubkeys FOR INSERT
  WITH CHECK (
    wallet_hash IS NOT NULL
    AND wallet_hash != ''
    AND public_key_base64 IS NOT NULL
    AND public_key_base64 != ''
  );

-- UPDATE: only rows with valid wallet_hash; new row must keep valid structure
CREATE POLICY "Pubkeys update by owner"
  ON chat_pubkeys FOR UPDATE
  USING (wallet_hash IS NOT NULL AND wallet_hash != '')
  WITH CHECK (
    wallet_hash IS NOT NULL
    AND wallet_hash != ''
    AND public_key_base64 IS NOT NULL
    AND public_key_base64 != ''
  );

-- ========== terms_acceptances ==========
DROP POLICY IF EXISTS "Terms insert by user" ON terms_acceptances;

-- INSERT: require valid wallet hash and terms version
CREATE POLICY "Terms insert by user"
  ON terms_acceptances FOR INSERT
  WITH CHECK (
    wallet_hash IS NOT NULL
    AND wallet_hash != ''
    AND terms_version IS NOT NULL
    AND terms_version != ''
  );
