-- Clear all shipping address data - we do not store shipping addresses
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

UPDATE profiles SET shipping_address = NULL WHERE shipping_address IS NOT NULL;
