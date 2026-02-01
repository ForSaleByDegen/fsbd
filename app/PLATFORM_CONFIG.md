# Platform Config (Admin-Adjustable Thresholds)

Admins can adjust auction and tier thresholds as $FSBD market cap changes.

## Philosophy

- **As market cap rises**, the dollar value of holding X tokens goes up. To keep auction creation accessible, **lower** `auction_min_tokens` over time (e.g. from 10M to 1M).
- **Holding remains beneficial**: Fee discounts and tier benefits stay tied to bronze/silver/gold. Users with more $FSBD get better platform fee rates regardless of the auction gate.

## Setup

1. Run `supabase/migration_platform_config.sql` in Supabase SQL Editor.

2. Admins access **Admin Dashboard → Platform Config** to adjust values.

## Config Keys

| Key | Default | Description |
|-----|---------|-------------|
| `auction_min_tokens` | 10,000,000 | Min $FSBD to create auctions. Lower when token price rises. |
| `tier_bronze` | 100,000 | Bronze tier threshold (for future tier logic) |
| `tier_silver` | 1,000,000 | Silver tier threshold |
| `tier_gold` | 10,000,000 | Gold tier threshold |

## When to Adjust

**Lower auction_min_tokens when:**
- $FSBD price increases (e.g. 10x) — 10M tokens becomes too expensive for most
- You want more auction activity
- Community requests more accessible auctions

**Example:** Token 10x in price → lower auction gate from 10M to 1M so equivalent dollar entry stays similar.

## API

- `GET /api/config` — Public, returns current config
- `PATCH /api/admin/config` — Admin only, body: `{ wallet, auction_min_tokens?, tier_bronze?, tier_silver?, tier_gold? }`
