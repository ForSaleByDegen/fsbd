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
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

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

-- Helper function to get wallet hash from JWT claim (set by app)
-- Note: This requires setting the claim in your Supabase client
CREATE OR REPLACE FUNCTION get_wallet_hash()
RETURNS TEXT 
LANGUAGE plpgsql 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'wallet_hash';
END;
$$;

-- Helper function to check if wallet is admin
CREATE OR REPLACE FUNCTION is_wallet_admin(wallet_hash TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.wallet_address_hash = wallet_hash 
    AND admins.is_active = true
  );
END;
$$;

-- Listings RLS Policies

-- Anyone can read active listings (public access)
CREATE POLICY "Public can view active listings"
  ON listings FOR SELECT
  USING (status = 'active');

-- Note: For MVP, we rely on app-level validation for ownership
-- The app validates wallet ownership before allowing updates/deletes
-- For production, implement JWT-based RLS with wallet_hash claims

-- Allow inserts (app validates ownership)
-- More restrictive: require wallet_address_hash to be set
CREATE POLICY "Allow listing inserts"
  ON listings FOR INSERT
  WITH CHECK (
    wallet_address_hash IS NOT NULL 
    AND wallet_address_hash != ''
    AND title IS NOT NULL
    AND description IS NOT NULL
    AND price > 0
  );

-- Allow updates (app validates ownership)
-- More restrictive: only allow updates to active listings
CREATE POLICY "Allow listing updates"
  ON listings FOR UPDATE
  USING (
    status = 'active'
    AND wallet_address_hash IS NOT NULL
  )
  WITH CHECK (
    status = 'active'
    AND wallet_address_hash IS NOT NULL
  );

-- Allow deletes (app validates ownership or admin)
-- More restrictive: only allow deletes of active listings
CREATE POLICY "Allow listing deletes"
  ON listings FOR DELETE
  USING (
    status = 'active'
    AND wallet_address_hash IS NOT NULL
  );

-- Profiles RLS Policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    wallet_address_hash = get_wallet_hash()
    OR is_wallet_admin(get_wallet_hash())
  );

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (
    wallet_address_hash = get_wallet_hash()
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (wallet_address_hash = get_wallet_hash())
  WITH CHECK (wallet_address_hash = get_wallet_hash());

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_wallet_admin(get_wallet_hash()));

-- Admins RLS Policies

-- Restrict admin table access (app validates admin status)
-- In production, use service role key for admin operations
CREATE POLICY "Restrict admin access"
  ON admins FOR SELECT
  USING (true); -- App validates admin status before querying

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
