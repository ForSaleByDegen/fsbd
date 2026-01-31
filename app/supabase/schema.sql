-- Supabase Schema for FSBD App
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users/Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL, -- Encrypted in app
  email TEXT, -- From Privy if available
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'bronze', 'silver', 'gold')),
  listings_count INTEGER DEFAULT 0,
  total_fees_paid NUMERIC DEFAULT 0,
  total_listings_sold INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL, -- Encrypted in app
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  permissions TEXT[] DEFAULT ARRAY['manage_listings', 'manage_users', 'view_analytics'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES admins(id),
  is_active BOOLEAN DEFAULT true
);

-- Listings table (enhanced)
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('for-sale', 'services', 'gigs', 'housing', 'community', 'jobs')),
  price NUMERIC NOT NULL,
  price_token TEXT DEFAULT 'SOL' CHECK (price_token IN ('SOL', 'USDC')),
  images TEXT[],
  wallet_address_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL, -- Encrypted in app
  has_token BOOLEAN DEFAULT false,
  token_mint TEXT,
  token_name TEXT,
  token_symbol TEXT,
  fee_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'removed', 'pending_review')),
  buyer_wallet_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Auction fields
  is_auction BOOLEAN DEFAULT false,
  auction_end_time BIGINT, -- Unix timestamp
  reserve_price NUMERIC,
  offers_open BOOLEAN DEFAULT true,
  highest_bid NUMERIC,
  highest_bidder TEXT,
  highest_bid_escrow TEXT -- PDA address
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings(category);
CREATE INDEX IF NOT EXISTS listings_wallet_hash_idx ON listings(wallet_address_hash);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS listings_is_auction_idx ON listings(is_auction);
CREATE INDEX IF NOT EXISTS profiles_wallet_hash_idx ON profiles(wallet_address_hash);
CREATE INDEX IF NOT EXISTS admins_wallet_hash_idx ON admins(wallet_address_hash);
CREATE INDEX IF NOT EXISTS admins_is_active_idx ON admins(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Listings RLS Policies

-- Anyone can read active listings
CREATE POLICY "Anyone can view active listings"
  ON listings FOR SELECT
  USING (status = 'active');

-- Users can view their own listings (any status)
CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT
  USING (
    wallet_address_hash = current_setting('app.wallet_hash', true)
    OR wallet_address_hash IN (
      SELECT wallet_address_hash FROM admins WHERE is_active = true
    )
  );

-- Users can insert their own listings
CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  WITH CHECK (
    wallet_address_hash = current_setting('app.wallet_hash', true)
  );

-- Users can update their own active listings
CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (
    wallet_address_hash = current_setting('app.wallet_address_hash', true)
    AND status = 'active'
  );

-- Admins can manage all listings
CREATE POLICY "Admins can manage all listings"
  ON listings FOR ALL
  USING (
    wallet_address_hash IN (
      SELECT wallet_address_hash FROM admins WHERE is_active = true
    )
  );

-- Profiles RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    wallet_address_hash = current_setting('app.wallet_hash', true)
    OR wallet_address_hash IN (
      SELECT wallet_address_hash FROM admins WHERE is_active = true
    )
  );

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    wallet_address_hash = current_setting('app.wallet_hash', true)
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (
    wallet_address_hash = current_setting('app.wallet_hash', true)
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    wallet_address_hash IN (
      SELECT wallet_address_hash FROM admins WHERE is_active = true
    )
  );

-- Admins RLS Policies

-- Only admins can view admin table
CREATE POLICY "Admins can view admins"
  ON admins FOR SELECT
  USING (
    wallet_address_hash IN (
      SELECT wallet_address_hash FROM admins WHERE is_active = true
    )
  );

-- Note: Admin creation should be done manually via SQL or service role key
-- This ensures only trusted admins can be added

-- Function to check if user is admin (for use in policies)
CREATE OR REPLACE FUNCTION is_admin(wallet_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE wallet_address_hash = wallet_hash 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
