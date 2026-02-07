-- Add explicit RLS policies for lister airdrop tables
-- Fixes Supabase linter: rls_enabled_no_policy
-- These tables are admin-only; access via service role (bypasses RLS). No policies = deny all for anon/authenticated.
-- Adding explicit restrictive policies satisfies the linter while keeping the same behavior.

CREATE POLICY "lister_airdrop_snapshots_admin_only"
  ON public.lister_airdrop_snapshots
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "lister_airdrop_recipients_admin_only"
  ON public.lister_airdrop_recipients
  FOR ALL
  USING (false)
  WITH CHECK (false);
