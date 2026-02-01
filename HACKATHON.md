# For Sale By Degen ($FSBD) - Hackathon Submission

<!-- Built for: [Hackathon Name] - add before submitting -->

## Project Overview

**For Sale By Degen** ($FSBD) is a privacy-first, decentralized Craigslist-style marketplace on Solana. Buy and sell with crypto, meet locally or ship, optional escrow, and tiered benefits via $FSBD token holdings.

## Tagline

**Craigslist for crypto. Wallet-only. No tracking. Local pickup or ship.**

## Live Demo

- **App**: https://fsbd.fun
- **GitHub**: https://github.com/ForSaleByDegen/fsbd

## What We Built

### Core Features
- **Wallet-only auth** — Connect Phantom, Solflare; no email or signup
- **Listings** — Create, browse, search with IPFS images
- **Crypto payments** — SOL/USDC with Solana Pay
- **Local pickup or ship** — Filter by delivery method and location
- **Optional escrow** — User-initiated between buyer/seller
- **Honor system** — Buyer confirms receipt, seller feedback, public stats
- **Encrypted chat** — E2E encrypted messaging per listing

### $FSBD Token & Tiers
- **Platform token** — Hold $FSBD for fee discounts and features
- **Free tier** — List for free (message signing only)
- **Bronze/Silver/Gold** — Reduced platform fees, auction creation

### Privacy
- No shipping address storage (P2P via encrypted chat)
- Wallet addresses hashed
- No tracking, no analytics

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind, shadcn/ui
- **Blockchain**: Solana, @solana/web3.js, SPL Token, Wallet Adapter
- **Backend**: Supabase (PostgreSQL, Realtime)
- **Storage**: IPFS (Pinata)

## How to Run Locally

```bash
git clone https://github.com/ForSaleByDegen/fsbd.git
cd fsbd/app
npm install
cp .env.example .env
# Edit .env with Supabase, Pinata, RPC URL
npm run dev
```

Open http://localhost:3000

## Environment Variables (Minimum)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PINATA_JWT`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_APP_WALLET`
- `NEXT_PUBLIC_FSBD_TOKEN_MINT` (after token launch)

## Token Launch

```bash
cd app
KEYPAIR_PATH=./your-keypair.json npm run launch-fsbd-token
# Add output mint address to NEXT_PUBLIC_FSBD_TOKEN_MINT
```

## Hackathon Notes

- Demo on **Devnet** or **Mainnet** — configurable via `NEXT_PUBLIC_SOLANA_NETWORK`
- Free listings work without token; tier system activates once $FSBD is deployed
- PWA-ready for mobile (Solana Saga, etc.)
