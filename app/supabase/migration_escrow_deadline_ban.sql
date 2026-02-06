-- Escrow 7-Day Deadline & Seller Ban
-- Run in Supabase SQL Editor

-- Add escrow_deposited_at to listings (for 7-day seller tracking deadline)
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS escrow_deposited_at TIMESTAMP WITH TIME ZONE;

-- Add banned_at and banned_reason to profiles (for seller ban on non-shipment)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- Index for deadline cron (find listings pending tracking past 7 days)
CREATE INDEX IF NOT EXISTS listings_escrow_deadline_idx
  ON listings(escrow_deposited_at)
  WHERE escrow_status = 'pending' AND status = 'in_escrow';

-- Index for banned seller lookups
CREATE INDEX IF NOT EXISTS profiles_banned_idx ON profiles(banned_at) WHERE banned_at IS NOT NULL;
