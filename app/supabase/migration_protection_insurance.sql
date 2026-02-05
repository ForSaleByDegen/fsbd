-- Optional buyer protection: fees collected + claims for reimbursement
-- See docs/INSURANCE_DESIGN.md for full design. Feature not yet wired to purchase flow.

CREATE TABLE IF NOT EXISTS protection_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  buyer_wallet_hash TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token TEXT NOT NULL DEFAULT 'SOL',
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protection_fees_listing_idx ON protection_fees(listing_id);
CREATE INDEX IF NOT EXISTS protection_fees_buyer_idx ON protection_fees(buyer_wallet_hash);

CREATE TABLE IF NOT EXISTS protection_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  buyer_wallet_hash TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('not_received','not_as_described','other')),
  description TEXT,
  evidence_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  payout_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS protection_claims_listing_idx ON protection_claims(listing_id);
CREATE INDEX IF NOT EXISTS protection_claims_buyer_idx ON protection_claims(buyer_wallet_hash);
CREATE INDEX IF NOT EXISTS protection_claims_status_idx ON protection_claims(status);

COMMENT ON TABLE protection_fees IS 'Optional 2% buyer protection fees; funds reimbursement pool';
COMMENT ON TABLE protection_claims IS 'Buyer protection claims; admin reviews and approves payouts';

ALTER TABLE protection_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE protection_claims ENABLE ROW LEVEL SECURITY;

-- Service role only for writes; no public policies
CREATE POLICY "Service role only protection_fees" ON protection_fees FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "Service role only protection_claims" ON protection_claims FOR ALL USING (false) WITH CHECK (false);
