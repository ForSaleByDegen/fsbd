-- Lister rewards airdrop: snapshot + tracking
-- 30% supply reserved for rewards. Airdrop 4200.69 $FSBD to each unique lister.

-- Snapshot of listers at a point in time
CREATE TABLE IF NOT EXISTS lister_airdrop_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  amount_per_wallet NUMERIC NOT NULL,
  token_mint TEXT,
  total_recipients INTEGER NOT NULL,
  created_by TEXT,
  notes TEXT
);

-- Recipients for each snapshot (one row per wallet per snapshot)
CREATE TABLE IF NOT EXISTS lister_airdrop_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_id UUID NOT NULL REFERENCES lister_airdrop_snapshots(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_address_hash TEXT,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  tx_signature TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(snapshot_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS lister_airdrop_recipients_snapshot_idx ON lister_airdrop_recipients(snapshot_id);
CREATE INDEX IF NOT EXISTS lister_airdrop_recipients_status_idx ON lister_airdrop_recipients(status);
CREATE INDEX IF NOT EXISTS lister_airdrop_recipients_wallet_idx ON lister_airdrop_recipients(wallet_address);

COMMENT ON TABLE lister_airdrop_snapshots IS 'Rewards snapshots: listers eligible for 4200.69 $FSBD airdrop';
COMMENT ON TABLE lister_airdrop_recipients IS 'Per-wallet airdrop status per snapshot';
