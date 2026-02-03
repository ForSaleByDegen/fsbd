-- Fix Supabase linter: RLS enabled but no policy
-- beta_signups and bug_reports are only accessed via API (service role, bypasses RLS).
-- Add explicit restrictive policy: no anon/client access. Satisfies linter.

-- bug_reports: API-only (insert/read via service role)
DROP POLICY IF EXISTS "Anyone can submit bug report" ON bug_reports;
CREATE POLICY "bug_reports_api_only"
  ON bug_reports FOR ALL
  USING (false)
  WITH CHECK (false);

-- beta_signups: API-only (insert/read via service role)
DROP POLICY IF EXISTS "Anyone can sign up for beta" ON beta_signups;
CREATE POLICY "beta_signups_api_only"
  ON beta_signups FOR ALL
  USING (false)
  WITH CHECK (false);
