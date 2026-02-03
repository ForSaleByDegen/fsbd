-- Fix Supabase linter: remove permissive INSERT policy on listing_public_messages
-- All inserts go through the API (service role), which bypasses RLS.
-- No client inserts directly; the API enforces $FSBD token-gating server-side.
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "Public chat messages insert by any user" ON listing_public_messages;
