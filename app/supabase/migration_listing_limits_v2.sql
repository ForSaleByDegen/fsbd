-- Listing limits v2: early adopters (99), free users (1), token holders or subscribers for more
-- Run in Supabase SQL Editor

-- Early adopter: first 100 users by profile creation get 99 listings each
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS early_adopter_rank INTEGER;
COMMENT ON COLUMN profiles.early_adopter_rank IS '1-100 for first 100 users; NULL otherwise. Enables 99 listings for early adopters.';

-- Subscription: tiered like token holders (basic/bronze/silver/gold)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('basic','bronze','silver','gold'));
COMMENT ON COLUMN profiles.subscription_expires_at IS 'When subscription ends. Active if > now().';
COMMENT ON COLUMN profiles.subscription_tier IS 'Subscription tier: basic=2, bronze=10, silver=30, gold=100 listings. Used when subscription_expires_at > now().';

-- Backfill early adopter ranks (first 100 by created_at)
-- Safe to re-run: only updates profiles with early_adopter_rank IS NULL
WITH ordered AS (
  SELECT wallet_address_hash, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM profiles
)
UPDATE profiles
SET early_adopter_rank = ordered.rn
FROM ordered
WHERE profiles.wallet_address_hash = ordered.wallet_address_hash
  AND ordered.rn <= 100
  AND profiles.early_adopter_rank IS NULL;
