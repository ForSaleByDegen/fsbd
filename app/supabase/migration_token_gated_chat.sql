-- Token-gated public chat: when listing has token_mint, messages are encrypted
-- Only token holders and seller can read/post. Adds encrypted_content and nonce.
-- Run after migration_public_chat.sql

ALTER TABLE listing_public_messages
  ADD COLUMN IF NOT EXISTS encrypted_content TEXT,
  ADD COLUMN IF NOT EXISTS nonce TEXT;

-- When token-gated: content is empty or placeholder, encrypted_content + nonce hold the ciphertext
-- When not token-gated: content has plaintext, encrypted_content and nonce are null
COMMENT ON COLUMN listing_public_messages.encrypted_content IS 'Encrypted message when listing has token (token-gated chat)';
COMMENT ON COLUMN listing_public_messages.nonce IS 'Nonce for TweetNaCl secretbox when encrypted';
