-- Verification Queries for Escrow Migration
-- Run these to verify all columns were added successfully

-- Check profiles table columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('email', 'email_verified', 'escrow_pda', 'shipping_address')
ORDER BY column_name;

-- Check listings table columns (you already ran this)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'listings' 
  AND column_name IN ('escrow_pda', 'escrow_amount', 'escrow_status', 'shipped_at', 'received_at', 'shipping_label_id', 'tracking_number', 'shipping_carrier', 'first_half_released', 'second_half_released', 'buyer_wallet_address')
ORDER BY column_name;

-- Check indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('listings', 'profiles')
  AND indexname LIKE '%escrow%' OR indexname LIKE '%buyer%' OR indexname LIKE '%email%'
ORDER BY tablename, indexname;

-- Check constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid IN (
  'listings'::regclass,
  'profiles'::regclass
)
AND conname LIKE '%escrow%' OR conname LIKE '%status%'
ORDER BY conname;
