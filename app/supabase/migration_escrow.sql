-- Escrow System Database Migration
-- Run this in Supabase SQL Editor
-- DO NOT copy the markdown code blocks, only the SQL below

-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escrow_pda TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add new columns to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS escrow_pda TEXT,
  ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shipping_label_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS first_half_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_half_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_wallet_address TEXT;

-- Update status constraint (drop old, add new)
ALTER TABLE listings 
  DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_status_check 
  CHECK (status IN ('active', 'sold', 'expired', 'removed', 'pending_review', 'in_escrow', 'shipped', 'completed', 'disputed'));

-- Add escrow_status constraint
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_escrow_status_check;

ALTER TABLE listings
  ADD CONSTRAINT listings_escrow_status_check
  CHECK (escrow_status IN ('pending', 'shipped', 'received', 'completed', 'disputed', 'refunded'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS listings_escrow_status_idx ON listings(escrow_status);
CREATE INDEX IF NOT EXISTS listings_buyer_wallet_hash_idx ON listings(buyer_wallet_hash);
CREATE INDEX IF NOT EXISTS profiles_escrow_pda_idx ON profiles(escrow_pda);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('email', 'email_verified', 'escrow_pda', 'shipping_address')
ORDER BY column_name;

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'listings' 
  AND column_name IN ('escrow_pda', 'escrow_amount', 'escrow_status', 'shipped_at', 'received_at', 'shipping_label_id', 'tracking_number', 'shipping_carrier', 'first_half_released', 'second_half_released', 'buyer_wallet_address')
ORDER BY column_name;
