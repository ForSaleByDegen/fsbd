-- Extend seller_verifications to store OAuth tokens (encrypted) for marketplace API access
-- Required for import/cross-post. Set SELLER_VERIFICATION_ENCRYPTION_KEY in env (32+ chars)

ALTER TABLE seller_verifications ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;
ALTER TABLE seller_verifications ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
ALTER TABLE seller_verifications ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN seller_verifications.access_token_encrypted IS 'Encrypted OAuth access token; server-only decryption';
COMMENT ON COLUMN seller_verifications.refresh_token_encrypted IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN seller_verifications.token_expires_at IS 'When access token expires; refresh if past';
