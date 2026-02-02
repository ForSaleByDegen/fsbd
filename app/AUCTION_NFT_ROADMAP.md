# Auction NFT Roadmap

## Current State
- Auctions create a **fungible SPL token** (1B supply, 90% seller / 10% dev) as a "listing token" for marketing
- On-chain: token mint + seller/dev token accounts
- Off-chain: listing stored in Supabase with auction params (end time, reserve price, etc.)
- Bidding: uses PDA-based escrow (custom logic)

## NFT-First + Metaplex Auction House (Future)

Your idea: **mint the item as an NFT, then run the auction on that NFT** aligns with industry standards.

### Option A: Metaplex Auction House (Recommended)
- **Escrow-less**: NFT stays in seller wallet until sale
- **Standard protocol**: Used by Magic Eden, Tensor, etc.
- **SDK**: `@metaplex-foundation/js` or `@metaplex-foundation/auction-house`
- **Flow**: Create Auction House → List NFT → Bid → Execute sale
- **Requires**: Metaplex Token Metadata (mpl-token-metadata) for NFT metadata

### Option B: NFT Mint + Custom Auction
- Mint listing image as NFT (Token Metadata or cNFT/Bubblegum)
- Store NFT mint in listing
- Keep current off-chain auction logic; settle by transferring NFT to winner

### Steps to Integrate Metaplex Auction House
1. Add `@metaplex-foundation/mpl-token-metadata` (or mpl-auction-house JS bindings)
2. Create an Auction House account for FSBD (one-time setup)
3. When creating auction: mint item as NFT with metadata (name, image, description)
4. List NFT on Auction House at reserve price
5. Bidders place bids via Auction House
6. Execute sale when auction ends (or instant buy at list price)

### Resources
- [Metaplex Auction House Docs](https://developers.metaplex.com/auction-house/overview)
- [Metaplex Developer Portal](https://developers.metaplex.com)
- Note: Original Auction House is deprecated; Metaplex recommends Auctioneer for timed auctions
