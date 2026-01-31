# Auction Features - For Sale By Degen

## New Auction Functionality

### 1. Auction Creation (Tier-Gated)

**Requirement**: Bronze tier or higher (1,000+ $FBSD tokens)

**Features**:
- Upload image via NFT.Storage (IPFS)
- Set reserve price (SOL/USDC)
- Configure auction duration (1, 3, or 7 days)
- Toggle offers open/closed during auction
- Automatic token launch (90% seller, 10% dev)

**Form Fields**:
- Title, description, category
- Reserve price + token type
- Auction duration
- Image upload
- Token name/symbol

### 2. Token Launch Per Listing

**Automatic on Auction Creation**:
- Creates new SPL token mint
- Mints 1B tokens total
- 90% to seller
- 10% to dev wallet
- Token metadata stored in listing

**Dev Buy Simulation**:
- After token creation, simulates dev wallet purchase
- 0.1 SOL base buy (scales to 0.2 SOL if item >1 SOL)
- Mock transaction on devnet
- Creates initial liquidity/hype

### 3. Bidding System

**PDA Escrow**:
- Each bid creates Program-Derived Address (PDA)
- Seeds: `[listingId, bidderPubkey]`
- Funds held in escrow until auction ends
- Trustless - no dev custody

**Bidding Flow**:
1. User enters bid amount
2. Validates: > current highest bid, >= reserve price
3. Creates PDA escrow
4. Transfers SOL/USDC to PDA
5. Updates listing with new highest bid
6. Previous bidder can be refunded (if outbid)

**Auction End**:
- Checks via `getClock()` / block time
- If highest bid >= reserve: release to seller
- Otherwise: refund all bidders
- Winner contacted for finalization

### 4. Fallback Manual Sale

**Option Available**:
- Users can still create regular listings (non-auction)
- No token launch required
- Seller handles payment negotiation
- Direct wallet-to-wallet transfer
- Chat/communication handled off-platform

### 5. Fee Integration

**Royalty Tracking**:
- Token royalties tracked in DB
- Seller's token allocation generates fees
- Fees can reduce next listing cost
- Applied automatically on next listing creation

## Technical Implementation

### Files Added/Updated

1. **`lib/auction-utils.ts`**
   - PDA derivation
   - Token creation (90/10 split)
   - Dev buy simulation
   - Escrow creation
   - Auction end checking

2. **`lib/nft-storage.ts`**
   - IPFS upload via NFT.Storage SDK
   - Image handling
   - CID to URL conversion

3. **`components/AuctionForm.tsx`**
   - Tier-gated form
   - Auction creation flow
   - Token launch integration

4. **`components/BiddingSection.tsx`**
   - Bid placement UI
   - Escrow creation
   - Auction status display
   - Time remaining counter

5. **`app/api/listings/[id]/bid/route.ts`**
   - Bid validation
   - Highest bid tracking
   - Escrow PDA storage

### Database Schema Updates

Add to `listings` table:
```sql
is_auction BOOLEAN DEFAULT false,
auction_end_time BIGINT, -- Unix timestamp
reserve_price NUMERIC,
offers_open BOOLEAN DEFAULT true,
highest_bid NUMERIC,
highest_bidder TEXT,
highest_bid_escrow TEXT -- PDA address
```

## Devnet Testing

### Setup Mock $FBSD Token

1. **Option 1: Use existing token**
   - Set `NEXT_PUBLIC_FBSD_TOKEN_MINT` to any SPL token mint
   - Users need to hold tokens to access Bronze+ tiers

2. **Option 2: Deploy mock token**
   ```bash
   # Use scripts/deployToken.ts from root
   # Or create simple SPL token
   ```

3. **Option 3: Manual tier override** (for testing)
   - Temporarily modify `getUserTier()` to return 'bronze' for testing

### Dev Wallet Setup

For dev buy simulation:

1. Generate dev wallet:
   ```bash
   solana-keygen new -o dev-wallet.json
   ```

2. Fund with devnet SOL:
   ```bash
   solana airdrop 2 $(solana address -k dev-wallet.json)
   ```

3. Export secret key:
   ```bash
   cat dev-wallet.json | jq -c '.[:32]'
   ```

4. Add to `.env`:
   ```
   NEXT_PUBLIC_DEV_WALLET_SECRET=[...array...]
   ```

### Testing Flow

1. **Get Bronze tier**:
   - Acquire mock $FBSD tokens
   - Or temporarily override tier check

2. **Create auction**:
   - Fill auction form
   - Upload image (requires NFT.Storage key)
   - Set reserve price
   - Submit

3. **Verify token creation**:
   - Check Solana Explorer for new mint
   - Verify 90/10 split
   - Check dev buy transaction

4. **Place bids**:
   - Connect different wallets
   - Place bids above reserve
   - Verify escrow PDAs created
   - Check highest bid updates

5. **Auction end**:
   - Wait for duration or manually check end time
   - Verify winner determination
   - Test escrow release (requires program)

## Security Notes

- **PDA Escrow**: Trustless, no dev custody of funds
- **Tier Gating**: On-chain balance checks only
- **Token Disclaimer**: All tokens marked "utility only, not investment"
- **Escrow Release**: Requires Solana program (currently placeholder)

## Limitations (MVP)

- Escrow release/refund requires full Solana program (currently mocked)
- Dev buy is simulation only (not real DEX swap)
- No automatic escrow release on auction end (manual for now)
- USDC bidding not fully implemented
- Royalty fee tracking in DB only (not on-chain)

## Next Steps

1. Deploy Solana program for escrow management
2. Implement automatic escrow release on auction end
3. Add USDC bidding support
4. Integrate with DEX for real token swaps
5. Add royalty on-chain tracking

---

**⚠️ Tokens for utility only, not investment. This is a utility token for marketplace access, not a financial instrument.**
