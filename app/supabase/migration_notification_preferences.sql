-- Notification preferences: email, phone (SMS), push
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_push_subscription JSONB;

COMMENT ON COLUMN profiles.notify_email IS 'Email for marketplace notifications (chat, bids, sales)';
COMMENT ON COLUMN profiles.notify_phone IS 'Phone for SMS updates (optional; Twilio integration later)';
COMMENT ON COLUMN profiles.notify_push_subscription IS 'Web Push subscription JSON for PWA device notifications';
