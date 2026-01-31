-- Fix RLS for seller tracking updates (status -> shipped)
-- Run in Supabase SQL Editor
-- Error: "new row violates row-level security policy" when seller adds tracking

-- Drop and recreate the update policy to allow escrow flow status changes
DROP POLICY IF EXISTS "Allow listing updates" ON listings;

CREATE POLICY "Allow listing updates"
  ON listings FOR UPDATE
  USING (
    status IN ('active', 'in_escrow', 'shipped', 'completed', 'disputed', 'sold', 'pending_review')
    AND wallet_address_hash IS NOT NULL
    AND wallet_address_hash != ''
  )
  WITH CHECK (
    status IN ('active', 'in_escrow', 'shipped', 'completed', 'disputed', 'sold', 'expired', 'removed', 'pending_review')
    AND wallet_address_hash IS NOT NULL
    AND wallet_address_hash != ''
  );
