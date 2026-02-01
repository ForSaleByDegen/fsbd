-- Bug reports from users (screenshots, failed tx, error messages)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address_hash TEXT,
  description TEXT NOT NULL,
  error_message TEXT,
  tx_signature TEXT,
  screenshot_urls TEXT[],
  page_url TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS bug_reports_created_at_idx ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_status_idx ON bug_reports(status);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (submit bug report)
CREATE POLICY "Anyone can submit bug report"
  ON bug_reports FOR INSERT
  WITH CHECK (true);

-- Only service role reads (admin via API)
-- No SELECT policy for anon - admins use service role
