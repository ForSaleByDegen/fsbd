-- Allow public to view sold listings (for Activity tab)
-- Run in Supabase SQL Editor if Activity tab returns empty without service role

DROP POLICY IF EXISTS "Public can view active listings" ON listings;

CREATE POLICY "Public can view active listings"
  ON listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Public can view sold listings"
  ON listings FOR SELECT
  USING (status = 'sold');
