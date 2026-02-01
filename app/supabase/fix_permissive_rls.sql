-- Fix Supabase linter: remove permissive RLS policies
-- Both beta_signups and bug_reports are inserted via API with service role (bypasses RLS).
-- No anon INSERT is needed; dropping these policies removes the security warning.

DROP POLICY IF EXISTS "Anyone can sign up for beta" ON beta_signups;
DROP POLICY IF EXISTS "Anyone can submit bug report" ON bug_reports;
