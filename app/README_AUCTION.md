# Auction Escrow Implementation

## Updated PDA Escrow Pattern

Based on the improved implementation, the auction escrow now uses proper PDA derivation and token account handling.

### Key Changes

1. **Proper PDA Creation**
   ```typescript
   // Seeds: [escrow, listingId, bidderPubkey]
   const escrowPda = await createBidEscrowPDA(listingId, bidder)
   ```

2. **Token Account Handling**
   - For SOL: Direct transfer to PDA
   - For SPL tokens (USDC): Creates associated token account for PDA
   - Uses `getAssociatedTokenAddressSync` with `allowOwnerOffCurve: true` for PDA

3. **Transaction Building**
   - `placeBidTx()` creates the transaction
   - Handles both SOL and SPL tokens
   - Automatically creates ATA if needed (idempotent)

### Usage

```typescript
// Place a bid
const transaction = await placeBidTx(
  listingId,
  bidderPublicKey,
  amountInLamports, // or token units
  'SOL' // or 'USDC' or mint address
)

// Sign and send
const signed = await signTransaction(transaction)
await connection.sendRawTransaction(signed.serialize())
```

### Escrow Release (Requires Program)

For production, you'll need a Solana program to:
1. Validate auction has ended
2. Transfer funds from PDA to seller (winner)
3. Refund losing bidders

See `lib/escrow-release.ts` for placeholder functions.

### Testing

1. **SOL Bidding**: Works immediately (no ATA needed)
2. **USDC Bidding**: Requires USDC mint address
   - Devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
   - Mainnet: Use actual USDC mint

### Notes

- PDA escrow is trustless (no dev custody)
- Each bidder gets their own PDA escrow
- Funds are held until auction ends
- Release/refund requires Solana program (not implemented in MVP)
