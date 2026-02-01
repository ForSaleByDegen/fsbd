-- Fix Supabase linter: remove permissive RLS policies, then disable RLS
-- Both beta_signups and bug_reports are inserted via API with service role (bypasses RLS).
-- No anon access needed; disabling RLS resolves "RLS enabled no policy" warning.

DROP POLICY IF EXISTS "Anyone can sign up for beta" ON beta_signups;
DROP POLICY IF EXISTS "Anyone can submit bug report" ON bug_reports;

ALTER TABLE beta_signups DISABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports DISABLE ROW LEVEL SECURITY;
