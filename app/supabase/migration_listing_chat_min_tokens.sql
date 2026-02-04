-- Per-listing minimum tokens to access token-gated chat.
-- Seller can use preset (1) or set custom amount.
-- Run in Supabase SQL Editor

ALTER TABLE listings ADD COLUMN IF NOT EXISTS chat_min_tokens INTEGER DEFAULT 1;
COMMENT ON COLUMN listings.chat_min_tokens IS 'Minimum listing tokens required to access chat. Default 1. Seller can set custom amount.';
