# User PDA Escrow Wallet System

## Overview

Each user gets a **unique PDA (Program Derived Address)** that acts as their escrow wallet. All purchase funds go to the seller's user PDA, and users can only withdraw when all obligations are met.

## Key Features

1. **One PDA Per User** - Each user has a single escrow wallet (not per-listing)
2. **Email Required** - Users must provide email for shipping labels and notifications
3. **Automated Shipping Labels** - Integration with EasyPost for label creation
4. **Withdrawal Restrictions** - Funds can only be withdrawn when:
   - All items sold are shipped
   - All purchases made are completed
   - No pending disputes

## Architecture

### User PDA Creation

```typescript
// Seeds: ['user-escrow', walletAddress]
const escrowPda = await createUserEscrowPDA(userWalletAddress)
```

Each user's PDA is derived from:
- Seed: `'user-escrow'`
- User's wallet address

This creates a unique, deterministic address for each user.

### Purchase Flow

1. **Buyer purchases item**
   - Platform fee collected immediately (separate transaction)
   - Remaining funds transferred to **seller's user escrow PDA**
   - Listing status: `in_escrow`

2. **Seller marks as shipped**
   - Can create shipping label via EasyPost integration
   - Database updated: `escrow_status = 'shipped'`
   - **50% released** (requires Solana program)

3. **Buyer confirms receipt**
   - Database updated: `escrow_status = 'completed'`
   - **Remaining 50% released** (requires Solana program)

### Withdrawal Restrictions

Users can only withdraw from their escrow PDA when:

```typescript
canUserWithdraw(userWalletAddress) returns:
- canWithdraw: true/false
- reason: Why withdrawal is blocked (if false)
- pendingItems: Number of pending items
```

Checks:
- ✅ No unshipped items (seller)
- ✅ No incomplete purchases (buyer)
- ✅ No pending disputes

## Database Schema

### Profiles Table (Updated)

```sql
email TEXT NOT NULL,              -- REQUIRED
email_verified BOOLEAN,           -- Email verification status
escrow_pda TEXT,                  -- User's escrow PDA address
shipping_address JSONB            -- Stored for label creation
```

### Listings Table (Updated)

```sql
escrow_pda TEXT,                  -- Seller's user escrow PDA
shipping_label_id TEXT,            -- EasyPost label ID
tracking_number TEXT,              -- Tracking number
shipping_carrier TEXT              -- USPS, UPS, FedEx, etc.
```

## Shipping Label Integration

### EasyPost Setup

1. Sign up at https://www.easypost.com/
2. Get API key
3. Add to environment: `NEXT_PUBLIC_EASYPOST_API_KEY`

### Creating Labels

```typescript
const labelData = await createShippingLabel({
  toAddress: buyerAddress,
  fromAddress: sellerAddress,
  parcel: { length, width, height, weight },
  service: 'Priority'
})

// Returns:
// - label_url (PDF download)
// - tracking_code
// - tracking_url
// - carrier
```

## Email Signup Flow

1. **User connects wallet**
2. **Email modal appears** (if email not set)
3. **User enters email**
4. **PDA created** and stored in profile
5. **User can now**:
   - Create listings
   - Purchase items
   - Create shipping labels
   - Withdraw funds (when eligible)

## Files Created/Modified

### New Files
- `app/lib/user-pda-wallet.ts` - User PDA utilities
- `app/lib/shipping-labels.ts` - EasyPost integration
- `app/components/EmailSignupModal.tsx` - Email signup UI
- `app/components/ShippingLabelForm.tsx` - Shipping label creation UI
- `app/USER_PDA_ESCROW_SYSTEM.md` - This file

### Modified Files
- `app/components/ListingDetail.tsx` - Updated to use user PDAs
- `app/components/EscrowActions.tsx` - Will integrate shipping labels
- `app/supabase/schema.sql` - Added email, PDA, shipping fields
- `app/lib/admin.ts` - May need updates for email requirement

## Implementation Status

### ✅ Completed
- User PDA creation system
- Email requirement and signup modal
- Database schema updates
- Shipping label API integration (EasyPost)
- Purchase flow updated to use user PDAs
- Withdrawal restriction logic

### ⚠️ Requires Integration
- Update `EscrowActions` to show shipping label form
- Add withdrawal UI component
- Email verification flow (optional)
- Solana program for actual fund release

## Next Steps

1. **EasyPost Setup**
   - Sign up for EasyPost account
   - Get API key
   - Add to Vercel environment variables

2. **Update EscrowActions**
   - Add shipping label form when marking as shipped
   - Show tracking info after label created

3. **Create Withdrawal UI**
   - Show escrow balance
   - Check withdrawal eligibility
   - Allow withdrawal when eligible

4. **Solana Program**
   - Deploy program for fund release
   - Validate withdrawal conditions
   - Release funds in stages (50/50)

5. **Testing**
   - Test email signup flow
   - Test purchase with user PDAs
   - Test shipping label creation
   - Test withdrawal restrictions

## Legal Considerations

See `ESCROW_LEGAL_COMPLIANCE.md` for:
- Money transmitter regulations
- Escrow service regulations
- Consumer protection laws
- Email/address data handling

---

**Status:** Core Implementation Complete - Requires EasyPost Setup and Solana Program
