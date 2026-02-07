-- Token launched via FSBD: used for 5% fee retention on redirect
-- Run in Supabase SQL Editor

ALTER TABLE listings ADD COLUMN IF NOT EXISTS token_launched_via_fsbd BOOLEAN DEFAULT false;
COMMENT ON COLUMN listings.token_launched_via_fsbd IS 'True when token was launched via AddTokenToListing (createPumpFunToken/createListingToken). False when linked existing. Used for 95/5 fee split on redirect.';
