# Chat Architecture

## Overview

Each listing has two chat modes:

1. **Public Chat** — Community discussion. When the listing has no token: unencrypted, anyone can read/post. When the seller launched a token with the listing: **token-gated and encrypted** — only token holders and the seller can read/post.
2. **Private DM** — Encrypted 1:1 between buyer and seller. Only the two participants can decrypt.

## Public Chat

- **Table:** `listing_public_messages`
- **Migrations:** `migration_public_chat.sql`, `migration_token_gated_chat.sql`
- **Plain (no token):** Messages are plaintext. Anyone can read/post.
- **Token-gated (listing has token_mint):** Messages are encrypted with TweetNaCl secretbox. Only token holders and the seller can read/post. Server verifies on-chain token balance before issuing the decryption key. Requires `TOKEN_CHAT_KEY_SECRET` env var.
- Sender identity shown as `User …abc123` (hashed wallet suffix).
- Enable Realtime on `listing_public_messages` for live updates (optional; polling fallback exists).

## Private DM (Encrypted)

- **Tables:** `chat_threads`, `chat_messages`
- **Encryption:** TweetNaCl secretbox with shared key derived from `sellerHash + buyerHash + threadId`
- **Isolation:** One thread per (listing, buyer) pair. User A ↔ Seller and User B ↔ Seller are **separate** — they never mix.
- **Key derivation:** Both parties derive the same 32-byte key from SHA256(sort([sellerHash, buyerHash, threadId])). Only they can decrypt.

### Seller UX

- Dropdown lists each buyer. Selecting a buyer loads that buyer's encrypted thread.
- Messages are stored encrypted at rest; decryption happens client-side with the shared key.

### Buyer UX

- Single thread with the seller. No dropdown (one conversation).

## Security

- **Private chat:** Truly P2P encrypted. Server stores only `encrypted_content` and `nonce`. Without the shared key (derived from participant hashes + thread), messages cannot be read.
- **Public chat:** Not encrypted — intentional for community discussion. Do not share sensitive info in public chat.
