# Listing Token Launch — Files & Flow

When a seller creates a listing and chooses **Launch a token for this listing**, this document describes the exact flow and files involved.

---

## Flow Overview

```
User fills form (title, description, price, images, token name/symbol)
    → Upload images to IPFS (Pinata)
    → Create listing (POST /api/listings) with has_token: true, token_mint: null
    → Build metadata (description, listing URL, optional socials)
    → Upload metadata + image to pump.fun IPFS (/api/pump-ipfs)
    → Call PumpPortal API to create token on pump.fun
    → Sign & send transaction (wallet)
    → PATCH listing with token_mint
    → Pay listing fee (SOL transfer to app wallet)
```

---

## Two Paths

### Path A: Create Listing First (recommended)

1. User checks **Launch a token for this listing**
2. User clicks **1. Create listing first**
3. Images → IPFS (Pinata)
4. Listing created via `POST /api/listings` with `has_token: true`, `token_mint: null`
5. Listing URL auto-filled in Website field
6. User optionally adds socials, clicks **2. Launch token**
7. Token created on pump.fun → PATCH listing with `token_mint` → pay fee

### Path B: Create + Launch in One Submit

1. User checks **Launch a token for this listing** and fills form
2. User clicks **Create Listing** (single button)
3. Same as Path A: create listing → launch token → PATCH → pay fee

---

## Files & Responsibilities

| File | Role |
|------|------|
| **`components/CreateListingForm.tsx`** | UI, form state, orchestration. Calls `handleCreateListingFirst` or `handleSubmit` → `createPumpFunToken` or `createListingToken` |
| **`lib/token-ops.ts`** | `createPumpFunToken()` — calls PumpPortal API; `createListingToken()` — SPL fallback; `getMetadataUri()` → `uploadToPumpIpfs()` |
| **`app/api/pump-ipfs/route.ts`** | Proxy: receives image + metadata, resizes to pump.fun limit (~1MB), uploads to pump.fun IPFS, returns metadata URI |
| **`app/api/token-metadata/route.ts`** | Extended metadata (listing URL, socials, banner) → Pinata JSON upload → returns URI. Used when extras provided. |
| **`app/api/listings/route.ts`** | POST: creates listing. PATCH (via `[id]/route.ts`): updates `token_mint` after launch |
| **`lib/pinata.ts`** | `uploadMultipleImagesToIPFS()` — listing images to Pinata (IPFS) |
| **`lib/image-validation.ts`** | `validateIconImage()` — 1:1, min 100px, max 4.5MB, PNG/JPG/WebP/GIF |
| **`lib/useVanityGrind.ts`** | Optional: grind vanity suffix for token mint address |

---

## Detailed Flow

### 1. Image Upload (listing)

- **Source**: `formData.images[0]` (first image = token icon)
- **Path**: `CreateListingForm` → `uploadMultipleImagesToIPFS()` (`lib/pinata.ts`)
- **Output**: `imageUrls[]` — Pinata gateway URLs (e.g. `https://gateway.pinata.cloud/ipfs/Qm...`)

### 2. Create Listing

- **Endpoint**: `POST /api/listings`
- **Body**: `title`, `description`, `price`, `images`, `has_token: true`, `token_mint: null`, `token_name`, `token_symbol`, etc.
- **Output**: `{ id: listingId }`
- **Listing URL**: `https://fsbd.fun/listings/{id}`

### 3. Token Metadata

- **`lib/token-ops.ts`** → `getMetadataUri()`:
  - Prefers **`/api/pump-ipfs`** — uploads image to pump.fun IPFS (resized to ~1MB), returns metadata URI
  - Fallback: **`/api/token-metadata`** when extras (socials, banner) and `imageUrl` provided
- **Extras**: `externalUrl` (listing URL), `website`, `twitter`, `telegram`, `discord`, `bannerUrl` (tier-gated)

### 4. Create Token on pump.fun

- **`lib/token-ops.ts`** → `createPumpFunToken()`
- **API**: `https://pumpportal.fun/api/trade-local` (PumpPortal)
- **Body**: `action: 'create'`, `tokenMetadata: { name, symbol, uri }`, `mint`, `amount` (dev buy SOL), `denominatedInSol: 'true'`, etc.
- **Flow**: Fetch serialized transaction → deserialize → sign with mint keypair + wallet → send
- **Output**: mint address (public key)

### 5. Update Listing with Mint

- **Endpoint**: `PATCH /api/listings/{id}`
- **Body**: `{ wallet, token_mint: "<mint_address>" }`

### 6. Pay Listing Fee

- **Transaction**: SOL transfer from user to `NEXT_PUBLIC_APP_WALLET`
- **Amount**: `calculateListingFee(tier)` — 0.1 SOL base, reduced by tier (bronze/silver/gold/platinum)

### 7. Fallback: SPL Token

- If pump.fun fails (simulation/read-only errors): `createListingToken()` in `lib/token-ops.ts`
- Creates simple SPL mint via `@solana/spl-token` — no bonding curve, no DEX listing

---

## Environment / Config

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_PINATA_JWT` | Pinata IPFS upload (listing images) |
| `NEXT_PUBLIC_APP_WALLET` | Receives listing fee (SOL) |
| `NEXT_PUBLIC_RPC_URL` | Solana RPC (Helius recommended) |

---

## Recovery

If pump.fun returns a simulation error but the tx may have succeeded:

- `TokenLaunchRecoveryForm` in `CreateListingForm.tsx` lets the user paste the mint address from pump.fun
- `PATCH /api/listings/{id}` with `token_mint` links it to the listing
