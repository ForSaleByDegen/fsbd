# Receipt cNFT Setup

When a buyer purchases with SOL, they receive a minimal receipt cNFT (image, description, price, date). Mint fee is deducted from the seller's payout.

## One-Time: Create Merkle Tree

1. Ensure you have ~0.34 SOL in a wallet for tree creation
2. Set env: `TREE_CREATOR_KEYPAIR` (JSON array from keypair file) or `KEYPAIR_PATH=./keypair.json`
3. Run: `npm run create-cnft-tree`
4. Add output to Vercel: `NEXT_PUBLIC_CNFT_TREE_ADDRESS=<address>`

## Env Vars

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CNFT_TREE_ADDRESS` | Merkle tree address (from create-cnft-tree) |
| `MINT_FEE_SOL` | Optional, defaults 0.0001 |

## Flow

- Buyer pays full price
- Seller receives `price - MINT_FEE_SOL`
- Buyer receives receipt cNFT (second Phantom approval)
- Receipt metadata: image URL, truncated description, price, date

## Migration

Run in Supabase SQL editor: `supabase/migration_receipt_cnft.sql`
