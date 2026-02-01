-- Re-enable RLS on bug_reports and beta_signups (fix Supabase linter: rls_disabled_in_public)
-- Our API uses supabaseAdmin (service role) which bypasses RLS, so this won't break anything.
-- No policies for anon = fully denied. Service role bypasses RLS for API inserts.

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
