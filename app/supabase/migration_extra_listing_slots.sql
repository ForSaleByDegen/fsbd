-- Add extra_paid_slots for users who pay 10,000 $FSBD per slot over tier limit
-- Run in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS extra_paid_slots INTEGER DEFAULT 0;

COMMENT ON COLUMN profiles.extra_paid_slots IS 'Listing slots purchased with 10,000 $FSBD each (over tier limit)';
