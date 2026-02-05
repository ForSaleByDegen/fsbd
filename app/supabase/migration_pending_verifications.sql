-- Pending manual verification codes (user adds QR to listing image, then submits URL)
CREATE TABLE IF NOT EXISTS pending_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  platform TEXT DEFAULT 'manual' CHECK (platform IN ('manual')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_verifications_wallet_idx ON pending_verifications(wallet_address_hash);
CREATE INDEX IF NOT EXISTS pending_verifications_code_idx ON pending_verifications(code);
CREATE INDEX IF NOT EXISTS pending_verifications_expires_idx ON pending_verifications(expires_at);

COMMENT ON TABLE pending_verifications IS 'One-time codes for manual seller verification; user adds QR to listing image';

ALTER TABLE pending_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only pending_verifications"
  ON pending_verifications FOR ALL
  USING (false)
  WITH CHECK (false);
