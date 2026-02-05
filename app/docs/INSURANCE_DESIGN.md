# Optional Buyer Protection Design

This document outlines the design for an optional insurance/protection plan to improve user satisfaction.

## Overview

**Goal:** Offer buyers an optional protection fee that funds a reimbursement pool for qualifying disputes (item not received, significantly not as described).

**Model:** Buyer pays a small percentage (e.g. 2%) at checkout. Fee goes to a platform-held pool. Claims are reviewed by admins; approved claims get reimbursed from the pool.

## Flow

1. **At purchase:** Buyer sees optional "Add buyer protection (2%)" checkbox.
2. **Transaction:** If checked, payment splits:
   - Listing price → seller
   - Protection fee (2% of price) → platform protection pool wallet
3. **Pool:** Platform holds SOL/USDC in a designated wallet. Balance visible (optional).
4. **Claim:** Buyer submits claim (listing ID, reason, evidence) via form.
5. **Review:** Admin reviews claim, checks tracking, chat logs, etc.
6. **Payout:** If approved, platform sends reimbursement from pool to buyer.

## Database

```sql
-- Protection fees collected
CREATE TABLE protection_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id),
  buyer_wallet_hash TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token TEXT NOT NULL,
  tx_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Protection claims
CREATE TABLE protection_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  buyer_wallet_hash TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'not_received', 'not_as_described', etc.
  description TEXT,
  evidence_url TEXT, -- e.g. screenshot, dispute doc
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  payout_tx TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Transaction Changes

- `prepare-transfer` API: accept `protectionFee: number` (e.g. 0.02 for 2%).
- Build transaction with two transfers: seller amount + platform pool amount.
- Platform pool wallet: new env var `PROTECTION_POOL_WALLET`.

## UI

- ListingDetail purchase section: checkbox "Add buyer protection (2%) — reimbursed if item not received or not as described"
- Profile / Purchases: "File protection claim" button for eligible purchases
- Admin: Claims review queue, approve/reject, trigger payout

## Limitations

- Pool must be funded; if pool is empty, claims can't be paid until more fees accumulate.
- Admin review is manual; no automated dispute resolution.
- Fraud risk: buyers could abuse claims. Mitigation: require tracking, delivery confirmation, limit claims per user.

## Phase 1 (MVP) ✅ Implemented

1. ~~Add protection_fees and protection_claims tables~~ Done (migration_protection_insurance.sql)
2. ~~Add checkbox + transaction split in purchase flow~~ Done (prepare-transfer, ListingDetail)
3. ~~Add claim submission API~~ Done (POST /api/protection/claim)
4. ~~Add claim button in Profile purchases + admin claims review UI~~ Done
5. Manual payout process (admin sends from pool; TODO)

**Env:** Set `PROTECTION_POOL_WALLET` (Solana address) to enable the 2% protection option.

## Phase 2 (Future)

- Automated rules (e.g. auto-approve if tracking shows delivered but buyer claims not received → require proof).
- Third-party insurance partnership.
- Dispute mediation.
