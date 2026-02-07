-- Enable RLS on lister airdrop tables (admin-only, accessed via service role which bypasses RLS)
-- Fixes Supabase linter: rls_disabled_in_public

ALTER TABLE lister_airdrop_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE lister_airdrop_recipients ENABLE ROW LEVEL SECURITY;

-- No permissive policies for anon/authenticated = deny all. Service role bypasses RLS.
