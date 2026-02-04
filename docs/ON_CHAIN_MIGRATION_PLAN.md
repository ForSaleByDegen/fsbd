# FSBD — Plan for 100% On-Chain / Less Hosting Dependency

A phased plan to reduce reliance on centralized hosting and move toward a fully on-chain architecture.

---

## Current Architecture (Centralized Components)

| Component | Where It Lives | Hosting Dependency |
|-----------|----------------|---------------------|
| **Frontend** | Next.js (Vercel) | Vercel / any Node host |
| **Listings** | Supabase PostgreSQL | Supabase |
| **Profiles** | Supabase | Supabase |
| **Chat** | Supabase | Supabase |
| **Images** | IPFS (Pinata) | Pinata (pinning service) |
| **Token metadata** | IPFS (Pinata / pump.fun) | Pinata, pump.fun IPFS |
| **Payments** | Solana | On-chain |
| **Tier checks** | Solana RPC | RPC node |
| **Escrow logic** | Supabase + PDA | Hybrid |
| **API routes** | Next.js serverless | Vercel / host |

---

## Target: Minimize Centralization

**Goals:**
1. No single point of failure for data
2. Survive if Vercel/Supabase/Pinata goes away
3. Users can run their own node/frontend and participate
4. Core data readable directly from chain/IPFS

---

## Phase 1 — Low Hanging Fruit (Weeks 1–2)

### 1.1 Decentralize Frontend Hosting

**Option A: Static Export + IPFS/Arweave**
- Next.js `output: 'export'` for static HTML/JS/CSS
- Deploy to: **Fleek**, **Pinata**, **Arweave** (via Bundlr/Ardrive)
- Users access via: `ipfs.io/ipfs/Qm...` or Arweave permalink
- **Caveat:** API routes don’t work with static export — need to move logic client-side or to a separate backend

**Option B: Keep Next.js, Add IPFS Mirror**
- Keep Vercel for primary domain
- Build static export and pin to IPFS as a mirror
- Users can use IPFS gateway as fallback

### 1.2 RPC Independence

- Support multiple RPC endpoints (Helius, QuickNode, public)
- Add fallback RPC list in config
- Document running a local Solana RPC/validator for full independence

### 1.3 Image Storage — Already Decentralized

- Images are on IPFS (Pinata). Once pinned, they’re content-addressed.
- **Action:** Document how to use a different pinning service (web3.storage, NFT.Storage, local IPFS node)
- **Action:** Add support for user-provided IPFS gateway URL in config

---

## Phase 2 — Move Listings On-Chain (Months 1–2)

### 2.1 Solana Program for Listings

**Design:**
- Deploy a Solana program (Anchor or native) with:
  - `Listing` account: title, description hash, category, price, seller, images (IPFS CIDs), token_mint, status, created_at
  - Instructions: `create_listing`, `update_listing`, `mark_sold`, `remove_listing`
- Store long text (description) on IPFS; on-chain store CID only
- Fees: Small SOL rent + optional platform fee on create

**Trade-offs:**
- **Cost:** ~0.01–0.05 SOL per listing (account rent)
- **Size limits:** Solana account max ~10KB; keep metadata small, rest on IPFS
- **Query:** Indexer (Helius, Triton, custom) or client-side fetch + filter

### 2.2 Migration Path

1. Deploy new program on devnet
2. Build parallel write path: create listing → both Supabase and on-chain
3. Build read path that prefers on-chain, falls back to Supabase
4. Migrate existing listings to chain (script + manual review)
5. Deprecate Supabase listings table

---

## Phase 3 — Profiles & Identity (Months 2–3)

### 3.1 Options

**A. Solana Program Accounts**
- `Profile` account per wallet: tier, reputation, IPFS pointer to extended profile JSON
- Pros: Fully on-chain, no Supabase
- Cons: Rent cost, size limits

**B. IPFS-Only Profiles**
- Profile JSON on IPFS, CID stored in a small on-chain account or PDA
- Pros: Flexible schema, cheap
- Cons: Need deterministic update mechanism (e.g. wallet signs new CID)

**C. SIWS + Ceramic / ComposeDB**
- Sign-in-with-Solana for auth; store profile in decentralized DB (Ceramic)
- Pros: Flexible, composable
- Cons: New dependency, learning curve

**Recommended:** Start with (B) — profile JSON on IPFS, pointer in a minimal on-chain account or even in listing accounts.

---

## Phase 4 — Chat (Months 3–4)

### 4.1 Options

**A. On-Chain Messages**
- Store each message in a Solana account
- Pros: Fully on-chain, auditable
- Cons: Expensive (~0.0005 SOL/message), slow

**B. XMTP**
- Decentralized messaging protocol; Solana wallet as identity
- Pros: Built for messaging, off-chain
- Cons: Different UX, integration effort

**C. P2P (e.g. OrbitDB, Gun)**
- Peer-to-peer log over IPFS or Gun
- Pros: No central server
- Cons: Sync complexity, UX challenges

**D. Keep Supabase for Chat (Pragmatic)**
- Chat is auxiliary; listings and payments are core
- Document Supabase as optional; if down, chat is degraded but marketplace still works

**Recommended:** Phase 4 as “optional.” Prioritize listings + profiles on-chain first. Chat can stay Supabase or move to XMTP later.

---

## Phase 5 — API Routes & Compute (Months 4–6)

### 5.1 Reduce API Route Usage

Current API routes do:
- Supabase CRUD (→ move to chain / client reads)
- Pinata uploads (→ client upload with user’s key, or keep server proxy)
- RPC calls (→ client can call RPC directly)
- Token creation via PumpPortal (→ stays external unless we build our own)
- Balance checks (→ client-side RPC)
- Config (→ on-chain or IPFS)

**Strategy:**
- Replace reads with client-side RPC + indexer
- Replace writes with client-signed transactions
- Keep only: proxy for Pinata (optional), PumpPortal relay (required), any admin endpoints

### 5.2 Serverless → Edge or P2P

- Vercel serverless is “hosting” but minimal — just a few proxies
- Alternative: Run a small Node/Deno service on a VPS or use Cloudflare Workers
- Long-term: Eliminate server entirely for read path; write path is user-signed txs

---

## Phase 6 — Full Decentralization (Ongoing)

### 6.1 Frontend Distribution

- Static build on IPFS + Arweave
- ENS or Solana Name Service for `fsbd.sol` or similar
- Multiple gateways: `fsbd.fun`, `ipfs.io/ipfs/...`, Arweave

### 6.2 Data Availability

- Listings: Solana
- Images: IPFS
- Metadata: IPFS
- Frontend: IPFS/Arweave
- Config: On-chain or IPFS

### 6.3 What Stays “Centralized” (By Design)

- **RPC nodes** — Someone runs them (Helius, QuickNode, or self-hosted)
- **IPFS pinning** — Pinata, web3.storage, or self-hosted node
- **PumpPortal / pump.fun** — External API for token creation; could be replaced with direct pump.fun program calls
- **Domain** — fsbd.fun points to a gateway; can be updated to IPFS redirect

---

## Summary Roadmap

| Phase | Focus | Timeline | Hosting Reduction |
|-------|-------|----------|-------------------|
| 1 | Static frontend on IPFS, RPC flexibility | 1–2 weeks | Medium |
| 2 | Listings on-chain | 1–2 months | High |
| 3 | Profiles on-chain/IPFS | 2–3 months | High |
| 4 | Chat (optional: XMTP or keep Supabase) | 3–4 months | Medium |
| 5 | Minimize API routes, client-direct RPC | 4–6 months | High |
| 6 | Full IPFS/Arweave frontend, multi-gateway | Ongoing | Very High |

---

## Immediate Next Steps

1. **This week:** Add IPFS static export script and document deployment to Fleek/Pinata
2. **This month:** Prototype Anchor program for listings (devnet)
3. **Next month:** Design listing → IPFS metadata schema (title, description, images as CIDs)
4. **Ongoing:** Document self-hosting options (Docker, fly.io, etc.) for users who want to run their own backend
