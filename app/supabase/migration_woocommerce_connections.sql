-- WooCommerce connections: user-provided store URL + API keys (encrypted)
CREATE TABLE IF NOT EXISTS woocommerce_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address_hash TEXT NOT NULL UNIQUE,
  store_url TEXT NOT NULL,
  consumer_key_encrypted TEXT NOT NULL,
  consumer_secret_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS woocommerce_connections_wallet_idx ON woocommerce_connections (wallet_address_hash);
ALTER TABLE woocommerce_connections ENABLE ROW LEVEL SECURITY;
