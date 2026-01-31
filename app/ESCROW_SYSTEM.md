# Purchase Escrow System

## Overview

The escrow system holds purchase funds in a Program Derived Address (PDA) on the Solana blockchain, releasing funds in two stages:
1. **50% released** when seller marks item as shipped
2. **Remaining 50% released** when buyer confirms receipt

## How It Works

### Purchase Flow

1. **Buyer purchases item**
   - Funds (total price) are transferred to escrow PDA
   - Platform fee is collected immediately (separate transaction)
   - Listing status changes to `in_escrow`
   - Database tracks escrow state

2. **Seller marks as shipped**
   - Seller clicks "Mark as Shipped" button
   - Database updates: `escrow_status = 'shipped'`, `shipped_at = now()`
   - **50% of funds should be released** (requires Solana program)
   - Buyer is notified

3. **Buyer confirms receipt**
   - Buyer clicks "Confirm Receipt" button
   - Database updates: `escrow_status = 'completed'`, `received_at = now()`
   - **Remaining 50% released** (requires Solana program)
   - Transaction complete

## Database Schema

New fields added to `listings` table:

```sql
escrow_pda TEXT,                    -- PDA address holding funds
escrow_amount NUMERIC,              -- Total amount in escrow
escrow_status TEXT,                 -- 'pending', 'shipped', 'received', 'completed', 'disputed'
shipped_at TIMESTAMP,               -- When seller marked as shipped
received_at TIMESTAMP,              -- When buyer confirmed receipt
first_half_released BOOLEAN,        -- 50% released flag
second_half_released BOOLEAN,      -- Remaining 50% released flag
buyer_wallet_address TEXT           -- Buyer's wallet (for PDA derivation)
```

## Files Created/Modified

### New Files
- `app/lib/purchase-escrow.ts` - Escrow utilities (PDA creation, transactions)
- `app/components/EscrowActions.tsx` - UI for seller/buyer actions
- `app/ESCROW_LEGAL_COMPLIANCE.md` - Legal compliance guide
- `app/ESCROW_SYSTEM.md` - This file

### Modified Files
- `app/components/ListingDetail.tsx` - Updated purchase flow to use escrow
- `app/supabase/schema.sql` - Added escrow tracking fields

## Current Implementation Status

### ✅ Completed
- PDA creation for escrow
- Fund transfer to escrow PDA
- Database tracking of escrow state
- UI for marking as shipped
- UI for confirming receipt
- Legal disclaimers

### ⚠️ Requires Solana Program
- **Actual fund release from PDA** - Requires deployed Solana program
- Current implementation creates transactions but they will fail without program
- Placeholder functions throw errors indicating program is needed

## Why Solana Program is Required

PDAs (Program Derived Addresses) can only be controlled by the program that created them. To release funds:

1. Deploy a Solana program that:
   - Validates seller identity (must be listing creator)
   - Checks escrow state (shipped/received)
   - Releases appropriate amount (50% or 100%)
   - Transfers funds from PDA to seller

2. The program should:
   - Verify seller marked item as shipped (for 50% release)
   - Verify buyer confirmed receipt (for remaining 50%)
   - Handle edge cases (disputes, refunds)

## Testing

### On Devnet
1. Create a listing
2. Purchase with test wallet
3. Verify funds are in escrow PDA (check Solana Explorer)
4. Mark as shipped (database updates)
5. Confirm receipt (database updates)
6. **Note:** Actual fund release requires program deployment

### Before Mainnet
1. Deploy escrow program to Solana
2. Test fund release thoroughly
3. Test dispute scenarios
4. Review legal compliance (see ESCROW_LEGAL_COMPLIANCE.md)
5. Update Terms of Service with disclaimers

## Legal Compliance

**CRITICAL:** Review `ESCROW_LEGAL_COMPLIANCE.md` before deploying to production.

Key considerations:
- Money transmitter regulations
- Escrow service regulations
- Consumer protection laws
- Tax obligations
- KYC/AML requirements

## Next Steps

1. **Legal Review** - Consult with legal counsel
2. **Solana Program Development** - Deploy escrow program
3. **Testing** - Thoroughly test on devnet
4. **Documentation** - Update user-facing docs
5. **Terms of Service** - Add escrow disclaimers
6. **Production Deployment** - Deploy after legal/program review

## Support

For questions about:
- **Technical implementation:** See code comments in `purchase-escrow.ts`
- **Legal compliance:** See `ESCROW_LEGAL_COMPLIANCE.md`
- **Database schema:** See `supabase/schema.sql`

---

**Status:** MVP Complete - Requires Solana Program for Production
