-- Profile privacy: hide listings and connected listings when private.
-- Basic stats (reviews, listing count, sold, bought, shipped, received) are ALWAYS public.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_private BOOLEAN DEFAULT false;
