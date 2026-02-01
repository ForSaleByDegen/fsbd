# Honor System Setup

Buyer confirm receipt + seller feedback + public stats.

## 1. Run the migration

In Supabase SQL Editor, run `supabase/migration_honor_system.sql`:

```sql
-- Adds: buyer_confirmed_received_at, total_confirmed_received, seller_feedback table
```

## 2. Features

- **Add shipping from profile**: Sellers see "Add Shipping Info" at the top of their profile for sold items.
- **Buyer confirm receipt**: Buyers can check "I received this item" on the listing or in My Purchases.
- **Leave feedback**: After confirming receipt, buyers can rate (1–5) and optionally comment.
- **Public seller stats**: `/seller?wallet=ADDRESS` shows confirmed deliveries, rating, and feedback.
- **Seller stats on listings**: Each listing shows the seller's stats (rating, deliveries).
