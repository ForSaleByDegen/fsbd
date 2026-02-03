-- Link listings to tokens: chat token-gating choice + accept listing token as payment
-- Run in Supabase SQL Editor

-- 1. Add chat_token_gated: seller can choose whether to token-gate public chat
ALTER TABLE listings ADD COLUMN IF NOT EXISTS chat_token_gated BOOLEAN DEFAULT true;
COMMENT ON COLUMN listings.chat_token_gated IS 'When true and listing has token_mint, public chat is token-gated. Seller can opt out.';

-- 2. Allow price_token to be LISTING_TOKEN (use listing token as payment) or custom SPL mints
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_price_token_check;
ALTER TABLE listings ADD CONSTRAINT listings_price_token_check
  CHECK (price_token IS NULL OR price_token = '' OR length(price_token) <= 100);
