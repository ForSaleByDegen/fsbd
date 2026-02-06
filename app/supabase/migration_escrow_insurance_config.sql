-- Escrow insurance config keys for platform_config
-- protection_coverage_cap_usd: max reimbursement per claim (starts at 100, increases as treasury grows)
-- sol_usd_rate: admin-set SOL/USD rate for display and claim payouts

INSERT INTO platform_config (key, value_json) VALUES
  ('protection_coverage_cap_usd', '100'),
  ('sol_usd_rate', '200')
ON CONFLICT (key) DO NOTHING;
