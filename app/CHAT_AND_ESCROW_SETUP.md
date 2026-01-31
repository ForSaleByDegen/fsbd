# Chat & Optional Escrow Setup

## Overview

- **Encrypted chat** between buyer and seller on each listing
- **Terms agreement** required before purchase
- **Optional escrow** – users agree in chat, then buyer deposits; seller ships with optional tracking; buyer confirms receipt

## Real-time Updates

The chat uses **Supabase Realtime** (instant) plus **polling every 4 seconds** as a fallback. To enable instant updates:

1. Supabase Dashboard → **Database** → **Replication**
2. Enable replication for `chat_messages` and `chat_threads`

If Realtime is not enabled, the 4-second polling still keeps the chat in sync.

## Database Migration

Run in Supabase SQL Editor:

```sql
-- See supabase/migration_chat.sql for full script
```

The migration creates:
- `chat_threads` – one per (listing, buyer) pair
- `chat_messages` – encrypted messages
- `chat_pubkeys` – reserved for future use
- `terms_acceptances` – records user agreement

## Flow

1. **Chat** – Buyer or seller opens listing → chat loads (or creates thread)
2. **Terms** – Before purchase, user must accept terms (stored in `terms_acceptances`)
3. **Optional escrow** – Buyer proposes in chat → seller accepts → buyer deposits to escrow PDA → seller marks shipped (optional tracking) → buyer confirms receipt
4. **Direct purchase** – User can still buy directly (no escrow) after accepting terms

## Encryption

Messages use shared-key encryption (TweetNaCl secretbox). The key is derived from `hash(seller_hash + buyer_hash + thread_id)` so both parties can decrypt.

## Escrow Note

Fund release from the escrow PDA requires a Solana program. Currently the flow updates the database; actual fund transfer would need a deployed escrow program.
