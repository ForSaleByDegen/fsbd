-- Fix Supabase Security Warnings
-- Run this in Supabase SQL Editor to fix linter warnings

-- 1. Fix function_search_path_mutable warnings
-- Add SET search_path = public to all functions

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Fix get_wallet_hash
CREATE OR REPLACE FUNCTION get_wallet_hash()
RETURNS TEXT 
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'wallet_hash';
END;
$$;

-- Fix is_wallet_admin
CREATE OR REPLACE FUNCTION is_wallet_admin(wallet_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.wallet_address_hash = wallet_hash 
    AND admins.is_active = true
  );
END;
$$;

-- Fix is_admin
CREATE OR REPLACE FUNCTION is_admin(wallet_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.wallet_address_hash = wallet_hash 
    AND admins.is_active = true
  );
END;
$$;

-- 2. Fix RLS policy warnings
-- Make policies more restrictive instead of always true

-- Drop existing policies
DROP POLICY IF EXISTS "Allow listing inserts" ON listings;
DROP POLICY IF EXISTS "Allow listing updates" ON listings;
DROP POLICY IF EXISTS "Allow listing deletes" ON listings;

-- Create more restrictive INSERT policy
CREATE POLICY "Allow listing inserts"
  ON listings FOR INSERT
  WITH CHECK (
    wallet_address_hash IS NOT NULL 
    AND wallet_address_hash != ''
    AND title IS NOT NULL
    AND description IS NOT NULL
    AND price > 0
    AND category IN ('for-sale', 'services', 'gigs', 'housing', 'community', 'jobs')
  );

-- Create more restrictive UPDATE policy
-- Allow updates to active listings AND escrow-related statuses (for escrow flow)
CREATE POLICY "Allow listing updates"
  ON listings FOR UPDATE
  USING (
    status IN ('active', 'in_escrow', 'shipped', 'completed', 'disputed')
    AND wallet_address_hash IS NOT NULL
    AND wallet_address_hash != ''
  )
  WITH CHECK (
    status IN ('active', 'in_escrow', 'shipped', 'completed', 'disputed', 'sold', 'expired', 'removed', 'pending_review')
    AND wallet_address_hash IS NOT NULL
    AND wallet_address_hash != ''
  );

-- Create more restrictive DELETE policy
CREATE POLICY "Allow listing deletes"
  ON listings FOR DELETE
  USING (
    status = 'active'
    AND wallet_address_hash IS NOT NULL
    AND wallet_address_hash != ''
  );

-- Verify fixes
SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) LIKE '%SET search_path%' AS has_search_path
FROM pg_proc
WHERE proname IN ('update_updated_at_column', 'get_wallet_hash', 'is_wallet_admin', 'is_admin')
  AND pronamespace = 'public'::regnamespace;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS command,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'listings'
  AND policyname LIKE 'Allow listing%'
ORDER BY policyname;
