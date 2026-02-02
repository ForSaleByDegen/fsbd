-- Add admin wallet: 5biEcZf9bpXQpiKzFqgFfxenyrNRjQkuzb1NDgiJ3kTb
-- Run in Supabase SQL Editor
-- If digest() fails, run: CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO admins (wallet_address_hash, wallet_address, role, permissions, is_active)
VALUES (
  encode(digest('5biEcZf9bpXQpiKzFqgFfxenyrNRjQkuzb1NDgiJ3kTb', 'sha256'), 'hex'),
  '5biEcZf9bpXQpiKzFqgFfxenyrNRjQkuzb1NDgiJ3kTb',
  'admin',
  ARRAY['manage_listings', 'manage_users', 'view_analytics', 'manage_admins'],
  true
)
ON CONFLICT (wallet_address_hash) DO UPDATE SET
  wallet_address = EXCLUDED.wallet_address,
  role = EXCLUDED.role,
  permissions = EXCLUDED.permissions,
  is_active = true;
