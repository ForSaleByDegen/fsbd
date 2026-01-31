# Escrow System Testing Guide

## Pre-Deployment Checklist

### 1. Database Migration
**CRITICAL:** Run the updated schema in Supabase SQL Editor:

```sql
-- Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escrow_pda TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Make email required (for new users)
-- Note: Existing users will need to add email via signup modal

-- Add new columns to listings table
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS escrow_pda TEXT,
  ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS shipping_label_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
  ADD COLUMN IF NOT EXISTS first_half_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_half_released BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_wallet_address TEXT;

-- Update status enum
ALTER TABLE listings 
  DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings
  ADD CONSTRAINT listings_status_check 
  CHECK (status IN ('active', 'sold', 'expired', 'removed', 'pending_review', 'in_escrow', 'shipped', 'completed', 'disputed'));

-- Update escrow_status enum
ALTER TABLE listings
  ADD CONSTRAINT listings_escrow_status_check
  CHECK (escrow_status IN ('pending', 'shipped', 'received', 'completed', 'disputed', 'refunded'));

-- Add indexes
CREATE INDEX IF NOT EXISTS listings_escrow_status_idx ON listings(escrow_status);
CREATE INDEX IF NOT EXISTS listings_buyer_wallet_hash_idx ON listings(buyer_wallet_hash);
CREATE INDEX IF NOT EXISTS profiles_escrow_pda_idx ON profiles(escrow_pda);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
```

### 2. Environment Variables
Add to Vercel environment variables:

```
NEXT_PUBLIC_EASYPOST_API_KEY=your_easypost_api_key_here
```

**To get EasyPost API key:**
1. Sign up at https://www.easypost.com/
2. Go to Settings > API Keys
3. Copy your test/production key
4. Add to Vercel

### 3. Verify Deployment
- Check Vercel deployment logs for errors
- Verify all environment variables are set
- Check that database migration ran successfully

## Testing Scenarios

### Test 1: Email Signup Flow

**Steps:**
1. Connect wallet (new user without email)
2. Try to create a listing or purchase an item
3. **Expected:** Email signup modal appears
4. Enter email address
5. Click "Continue"
6. **Expected:** 
   - Modal closes
   - User profile created with email
   - Escrow PDA created and stored
   - Can now create listings/purchase

**Verify:**
- Check Supabase `profiles` table:
  - `email` is set
  - `escrow_pda` is populated
  - `email_verified` is false (can verify later)

### Test 2: Purchase Flow (Buyer)

**Steps:**
1. Connect wallet as Buyer
2. Ensure buyer has email (signup if needed)
3. Browse listings
4. Click "Purchase" on an active listing
5. Confirm purchase
6. Sign transaction

**Expected:**
- Platform fee collected immediately
- Remaining funds transferred to seller's user escrow PDA
- Listing status changes to `in_escrow`
- Listing shows escrow information
- Buyer sees "Waiting for seller to mark as shipped"

**Verify:**
- Check Solana Explorer for transaction
- Check `listings` table:
  - `status = 'in_escrow'`
  - `escrow_pda` = seller's user PDA
  - `escrow_status = 'pending'`
  - `buyer_wallet_address` = buyer's wallet

### Test 3: Seller Marks as Shipped

**Steps:**
1. Connect wallet as Seller (of purchased listing)
2. Navigate to listing detail page
3. **Expected:** See "Seller Actions" section
4. Click "Mark as Shipped"
5. Confirm action

**Expected:**
- Database updated:
  - `escrow_status = 'shipped'`
  - `status = 'shipped'`
  - `shipped_at` timestamp set
- Seller sees "Waiting for buyer confirmation"
- Buyer sees "Confirm Receipt" button

**Note:** Actual fund release (50%) requires Solana program deployment

### Test 4: Shipping Label Creation

**Steps:**
1. As seller, mark item as shipped
2. **Expected:** Shipping label form appears (if integrated)
3. Enter seller address (from/to)
4. Enter package dimensions and weight
5. Select shipping service
6. Click "Create Shipping Label"

**Expected:**
- EasyPost API called
- Shipping label created
- Label PDF URL returned
- Tracking number generated
- Database updated:
  - `shipping_label_id` set
  - `tracking_number` set
  - `shipping_carrier` set

**Verify:**
- Check EasyPost dashboard for label
- Verify tracking number works
- Download label PDF

### Test 5: Buyer Confirms Receipt

**Steps:**
1. Connect wallet as Buyer
2. Navigate to purchased listing
3. **Expected:** See "Buyer Actions" section
4. Click "Confirm Receipt"
5. Confirm action

**Expected:**
- Database updated:
  - `escrow_status = 'completed'`
  - `status = 'completed'`
  - `received_at` timestamp set
- Transaction marked as complete
- Seller can now withdraw remaining 50%

**Note:** Actual fund release requires Solana program deployment

### Test 6: Withdrawal Restrictions

**Steps:**
1. Connect wallet as Seller
2. Try to withdraw from escrow PDA
3. **Scenario A:** Has unshipped items
   - **Expected:** Withdrawal blocked
   - Message: "You have X item(s) that need to be shipped"
4. **Scenario B:** All items shipped, purchases completed
   - **Expected:** Withdrawal allowed (when program deployed)

**Verify:**
- Check `canUserWithdraw()` function logic
- Verify all checks work correctly

### Test 7: Multiple Purchases

**Steps:**
1. Seller creates multiple listings
2. Different buyers purchase items
3. All funds go to seller's **same** user escrow PDA
4. Seller marks items as shipped one by one
5. Buyers confirm receipt

**Expected:**
- All funds accumulate in seller's single escrow PDA
- Each listing tracked separately
- Withdrawal only allowed when ALL obligations met

## Common Issues & Solutions

### Issue: "Seller has not completed email signup"
**Solution:** Seller must complete email signup first

### Issue: "EasyPost API key not configured"
**Solution:** Add `NEXT_PUBLIC_EASYPOST_API_KEY` to Vercel

### Issue: "Escrow release requires Solana program"
**Expected:** This is normal - actual fund release needs program deployment

### Issue: Email modal doesn't appear
**Check:**
- User profile exists
- Email field is null/empty
- Modal component imported correctly

### Issue: Shipping label creation fails
**Check:**
- EasyPost API key is valid
- Addresses are complete
- Package dimensions are valid
- Network connectivity

## Database Verification Queries

### Check user profiles with escrow PDAs:
```sql
SELECT wallet_address_hash, email, escrow_pda, email_verified
FROM profiles
WHERE escrow_pda IS NOT NULL;
```

### Check listings in escrow:
```sql
SELECT id, title, escrow_status, escrow_pda, escrow_amount, 
       shipped_at, received_at, tracking_number
FROM listings
WHERE escrow_status IS NOT NULL
ORDER BY created_at DESC;
```

### Check withdrawal eligibility:
```sql
-- Unshipped items (seller)
SELECT COUNT(*) as unshipped_count
FROM listings
WHERE wallet_address_hash = 'seller_hash_here'
  AND escrow_status IN ('pending', 'in_escrow');

-- Incomplete purchases (buyer)
SELECT COUNT(*) as incomplete_count
FROM listings
WHERE buyer_wallet_address = 'buyer_wallet_here'
  AND escrow_status IN ('pending', 'shipped');
```

## Next Steps After Testing

1. **Fix any bugs** found during testing
2. **Deploy Solana program** for actual fund release
3. **Set up email verification** (optional)
4. **Monitor production** for issues
5. **Gather user feedback**

## Production Monitoring

Watch for:
- Failed transactions
- Database errors
- EasyPost API errors
- User complaints about email requirement
- Withdrawal issues

---

**Status:** Ready for Testing
**Last Updated:** January 2026
