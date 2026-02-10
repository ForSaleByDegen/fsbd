-- Add ai_lookup_fee_fsbd: optional $FSBD fee for Snap-to-Compare AI lookup. When > 0, users must pay before analysis.
-- Admin can set via platform_config. 0 = free.
INSERT INTO platform_config (key, value_json, updated_at)
VALUES ('ai_lookup_fee_fsbd', '0', now())
ON CONFLICT (key) DO NOTHING;
