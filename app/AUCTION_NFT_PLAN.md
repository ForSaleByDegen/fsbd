# Auction NFT + Metaplex Auction House Plan

## Current State
- Auctions create a **fungible SPL token** (1B supply, 90% seller / 10% dev) as a "listing token"
- Listings and bids stored in Supabase; on-chain escrow uses PDAs (no deployed auction program yet)

## Target: NFT-First + Metaplex Auction House

Per [Metaplex Auction House docs](https://docs.metaplex.com/programs/auction-house/), the flow would be:

1. **Mint item as NFT** — Use Token Metadata (or UMI) to mint the listing image as an NFT with name, symbol, URI
2. **Create Auction House** — One-time setup: `metaplex.auctionHouse().create()` for FSBD marketplace
3. **List NFT** — `metaplex.auctionHouse().list()` creates a Sell Order (SellerTradeState PDA); asset stays in wallet until sale
4. **Bid** — `metaplex.auctionHouse().bid()` creates Buy Order; funds go to BuyerEscrowAccount PDA
5. **Execute sale** — `metaplex.auctionHouse().executeSale()` transfers NFT to winner, payment to seller

## Requirements
- **@metaplex-foundation/js** — Main SDK for Auction House (or use mpl-auction-house program library)
- **Token Metadata** — For minting NFTs (mpl-token-metadata); we have UMI/mpl-bubblegum for cNFTs but Auction House uses standard NFTs
- **Auction House account** — Create once per marketplace; configurable fees, treasury, etc.

## Integration Steps (Future)
1. Add `@metaplex-foundation/js` dependency
2. Create `/lib/auction-house.ts` — Metaplex client, Auction House PDA derivation
3. Create `/lib/mint-nft.ts` — Mint listing image as NFT with metadata
4. Update `AuctionForm` — Mint NFT first → List on Auction House → Save listing to Supabase
5. Update bid flow — Use `metaplex.auctionHouse().bid()` and `executeSale()`

## References
- [Metaplex Auction House Overview](https://docs.metaplex.com/programs/auction-house/)
- [Auction House JS SDK](https://github.com/metaplex-foundation/js/tree/master/packages/auction-house)
- [Metaplex Program Library - Auction House](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/auction-house)
