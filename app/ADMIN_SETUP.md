# Admin System Setup Guide

## Overview

The admin system provides:
- **Admin Dashboard**: Analytics, listing management, user management
- **Profile Enhancement**: User stats stored in Supabase
- **RLS Security**: Row-level security policies (simplified for MVP)
- **Admin Access Control**: Only designated admins can access admin features

## Setup Steps

### 1. Run Supabase Schema

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/schema.sql`
3. Click "Run" to execute
4. Verify tables were created: `listings`, `profiles`, `admins`

### 2. Create Your First Admin

Run this SQL in Supabase SQL Editor (replace with your wallet address):

```sql
-- Get your wallet hash first
SELECT encode(digest('YOUR_WALLET_ADDRESS_HERE', 'sha256'), 'hex') as wallet_hash;

-- Then insert yourself as admin
INSERT INTO admins (wallet_address_hash, wallet_address, role, permissions)
VALUES (
  encode(digest('YOUR_WALLET_ADDRESS_HERE', 'sha256'), 'hex'),
  'YOUR_WALLET_ADDRESS_HERE',
  'admin',
  ARRAY['manage_listings', 'manage_users', 'view_analytics', 'manage_admins']
);
```

### 3. Set Environment Variables

In Vercel, add:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

### 4. Redeploy

After setting environment variables, redeploy your app.

## Features

### Admin Dashboard (`/admin`)

- **Analytics Tab**: 
  - Total listings, active listings, users, fees
  - Listings by category
  - Recent activity

- **Listings Tab**:
  - View all listings with filters
  - Update listing status
  - Delete listings
  - Search functionality

- **Users Tab**:
  - View all user profiles
  - See user stats (listings, fees, tier)
  - Search users

### Enhanced Profile Page (`/profile`)

- Displays user stats from Supabase:
  - Listings created count
  - Listings sold count
  - Total fees paid
- Auto-creates profile on first visit
- Syncs tier from on-chain data

### Security

- **RLS Enabled**: Row-level security on all tables
- **App-Level Validation**: App validates ownership before allowing operations
- **Admin Checks**: Admin status verified before showing admin features
- **Wallet Hashing**: Wallet addresses hashed before storage

## Admin Roles

- **admin**: Full access to all features
- **moderator**: Limited permissions (can be customized)

## Permissions

- `manage_listings`: Can manage all listings
- `manage_users`: Can view/manage users
- `view_analytics`: Can view analytics dashboard
- `manage_admins`: Can manage admin users (admin only)

## Testing

1. **Test as regular user**:
   - Create a listing → Should work
   - Try to access `/admin` → Should redirect

2. **Test as admin**:
   - Add yourself as admin in Supabase
   - Connect wallet → "Admin" link should appear in header
   - Access `/admin` → Should show dashboard
   - Try managing listings → Should work

3. **Test profile**:
   - Create a listing → Profile stats should update
   - Check profile page → Should show stats

## Troubleshooting

- **Admin link not showing**: Check that your wallet is in the `admins` table and `is_active = true`
- **Can't access admin page**: Verify admin status with `isAdmin()` function
- **Profile stats not updating**: Check Supabase connection and RLS policies
- **RLS blocking operations**: See `supabase/RLS_SETUP.md` for RLS configuration
