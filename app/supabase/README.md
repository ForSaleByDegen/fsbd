# Supabase Setup Guide

## Database Schema Setup

1. **Go to your Supabase Dashboard** → SQL Editor

2. **Run the schema SQL**:
   - Copy the contents of `supabase/schema.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify tables were created**:
   - Go to Table Editor
   - You should see: `listings`, `profiles`, `admins`

## Row Level Security (RLS)

RLS is automatically enabled by the schema. The policies ensure:

- **Listings**: Anyone can view active listings, users can manage their own, admins can manage all
- **Profiles**: Users can view/update their own profile, admins can view all
- **Admins**: Only admins can view the admin table

## Creating Your First Admin

To create an admin user, run this SQL in Supabase SQL Editor:

```sql
-- Replace with your wallet address
INSERT INTO admins (wallet_address_hash, wallet_address, role, permissions)
VALUES (
  encode(digest('YOUR_WALLET_ADDRESS_HERE', 'sha256'), 'hex'), -- Hash of your wallet
  'YOUR_WALLET_ADDRESS_HERE', -- Your actual wallet address (will be encrypted)
  'admin',
  ARRAY['manage_listings', 'manage_users', 'view_analytics', 'manage_admins']
);
```

Or use the helper function:

```sql
-- Helper: Get wallet hash
SELECT encode(digest('YOUR_WALLET_ADDRESS', 'sha256'), 'hex') as wallet_hash;
```

## Environment Variables

Make sure these are set in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations, server-side only)

## Testing RLS

1. **Test as regular user**: Create a listing, verify you can only see your own
2. **Test as admin**: Add yourself as admin, verify you can see all listings
3. **Test public access**: Verify active listings are visible to everyone

## Security Notes

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client
- Wallet addresses are hashed before storage
- Sensitive data (wallet addresses) should be encrypted in the app before storing
- RLS policies enforce access control at the database level
