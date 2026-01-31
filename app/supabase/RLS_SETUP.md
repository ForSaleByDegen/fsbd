# RLS Setup Guide

## Important Note

The RLS policies use helper functions that check wallet hashes. However, Supabase RLS works best with authenticated users via JWT tokens.

## Two Approaches

### Approach 1: Simplified RLS (Recommended for MVP)

For now, we'll use a simpler approach where:
- Public listings are readable by anyone
- Users can only modify their own data (enforced by app logic)
- Admins use service role key for admin operations

**Update the schema.sql policies to:**

```sql
-- Simplified: Allow all reads, restrict writes
CREATE POLICY "Public can read active listings"
  ON listings FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can insert own listings"
  ON listings FOR INSERT
  WITH CHECK (true); -- App validates ownership

CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (true) -- App validates ownership
  WITH CHECK (true);
```

### Approach 2: Full RLS with JWT Claims (Advanced)

For production, you'd want to:
1. Use Supabase Auth with custom JWT claims
2. Set wallet_hash in JWT when user connects wallet
3. Use RLS policies that check JWT claims

This requires more setup but provides better security.

## Current Implementation

The current code uses:
- **App-level validation**: Checks wallet ownership before allowing operations
- **RLS for public data**: Anyone can read active listings
- **Service role for admin**: Admins use service role key to bypass RLS

This is secure enough for MVP and easier to implement.

## Testing RLS

1. **As regular user**: Try to update someone else's listing - should fail
2. **As admin**: Use service role key - should succeed
3. **Public access**: Verify active listings are visible without auth
