-- Optional social links and banner for profiles (used in token metadata when launching with listing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discord_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
COMMENT ON COLUMN profiles.banner_url IS 'Profile banner image URL (IPFS or HTTPS)';
COMMENT ON COLUMN profiles.twitter_url IS 'Twitter/X profile URL';
COMMENT ON COLUMN profiles.telegram_url IS 'Telegram profile URL';
COMMENT ON COLUMN profiles.discord_url IS 'Discord invite or profile URL';
COMMENT ON COLUMN profiles.website_url IS 'Personal or shop website URL';
