# Auction NFT Roadmap

## Current State
- Auctions create a **fungible SPL token** (1B supply, 90% seller / 10% dev) as a "listing token" for marketing
- On-chain: token mint + seller/dev token accounts
- Off-chain: listing stored in Supabase with auction params (end time, reserve price, etc.)
- Bidding: uses PDA-based escrow (custom logic)

## NFT-First + Metaplex Auction House (Future)

**Flow:** mint the item as an NFT → list on Auction House → bid → execute sale.

---

## Metaplex Auction House (SDK)

Auction House runs on **Mainnet Beta** and **Devnet**. Use the JS SDK for a simpler integration.

### JS SDK API (`metaplex.auctionHouse()`)

```js
// Creating and updating the Auction House
metaplex.auctionHouse().create();
metaplex.auctionHouse().update();

// Trading on Auction House
metaplex.auctionHouse().bid();
metaplex.auctionHouse().list();
metaplex.auctionHouse().executeSale();

// Cancelling a bid or listing
metaplex.auctionHouse().cancelBid();
metaplex.auctionHouse().cancelListing();

// Finding bids, listings and purchases
metaplex.auctionHouse().findBidBy();
metaplex.auctionHouse().findBidByTradeState();
metaplex.auctionHouse().findListingsBy();
metaplex.auctionHouse().findListingByTradeState();
metaplex.auctionHouse().findPurchasesBy();
```

### Integration Steps
1. Add `@metaplex-foundation/js` (includes Auction House module)
2. Create FSBD Auction House (one-time)
3. When creating auction: mint item as NFT (Token Metadata) → list via `list()`
4. Bidders: `bid()`, seller/anyone: `executeSale()` when auction ends
5. Escrow-less: NFT stays in seller wallet until sale

---

## Resources

| Resource | Link | Notes |
|----------|------|-------|
| Metaplex Auction House Program | [metaplex-program-library/auction-house](https://github.com/metaplex-foundation/metaplex-program-library/tree/master/auction-house/program) | Rust program (IDL) |
| Metaplex JS SDK | NPM `@metaplex-foundation/js` | High-level API |
| Anchor Auction (yoshidan) | [anchor-auction](https://github.com/yoshidan/anchor-auction) | NFT auction with Anchor; exhibitor → bidder flow |
| Solana Auction House (udbhav1) | [solana-auctionhouse](https://github.com/udbhav1/solana-auctionhouse) | English, sealed first-price, sealed second-price |
| Solana Program Examples | [program-examples](https://github.com/solana-developers/program-examples) | Escrow, token minting, NFT minting examples |

---

## Note on Deprecation
Metaplex marks the original Auction House as deprecated. For **timed auctions** (English, Dutch), consider Auctioneer. For FSBD-style instant sales and list-at-reserve, the SDK above still applies.
