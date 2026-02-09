-- Track last AI listing (Snap to Compare) usage per user for 1-per-day rate limit
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ai_listing_at TIMESTAMPTZ;
