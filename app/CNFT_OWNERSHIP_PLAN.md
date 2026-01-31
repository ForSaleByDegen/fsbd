# cNFT Ownership Transfer – Plan

## Overview

Using **compressed NFTs (cNFTs)** for items would provide:
- On-chain proof of ownership
- Transfer of ownership when a purchase completes
- Lower minting cost than regular NFTs (state compression)

## Requirements

1. **Helius or DAS-capable RPC** – Reading cNFTs requires the DAS API (Helius, Triton, etc.)
2. **@metaplex-foundation/mpl-bubblegum** – For creating and managing cNFTs
3. **Asset passthrough** – When buyer pays, transfer the cNFT to the buyer’s wallet

## Flow

1. **Listing creation** – Seller optionally mints a cNFT for the item (or attaches an existing one)
2. **Purchase** – Buyer pays SOL → seller’s wallet (or escrow) → cNFT is transferred to buyer
3. **Ownership** – Buyer’s wallet holds the cNFT as proof of ownership

## Implementation Steps

1. Add `mpl-bubblegum` and DAS utilities
2. Optional “Mint as cNFT” when creating a listing
3. Store `cnft_asset_id` or similar on the listing
4. On purchase completion, add a transfer instruction to move the cNFT to the buyer
5. Use a DAS-capable RPC (e.g. Helius) for fetching cNFT metadata

## Notes

- cNFTs are **immutable** after minting
- Transfer requires the asset’s tree and leaf index (from DAS)
- Ensure your RPC supports `getAsset` and `getAssetProof` (DAS API)
