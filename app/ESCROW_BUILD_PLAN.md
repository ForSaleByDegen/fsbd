# Escrow Build Plan

A phased plan to build, test, and launch the optional escrow flow with a deployed Solana program. Aligns with [Solana's SKILL.md](https://solana.com/SKILL.md) recommendations (Anchor, LiteSVM testing).

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **OptionalEscrowSection** | Built, hidden | Buyer deposits to escrow; 5% insurance added |
| **User PDA (user-pda-wallet.ts)** | Broken for release | Uses SystemProgram for PDA—funds cannot be released |
| **Database** | Ready | `escrow_pda`, `escrow_amount`, `escrow_status`, etc. |
| **Chat flow** | Ready | Propose/accept escrow in chat |
| **Release/Refund** | Placeholder | `escrow-release.ts` throws "requires Solana program" |

**Core issue:** PDAs derived with `SystemProgram.programId` cannot be signed by any program to move funds. You need a **custom Solana program** that owns escrow PDAs.

---

## Phase 1: Anchor Escrow Program

### 1.1 Setup

**Done.** Program scaffold at `programs/fsbd_escrow/`. See `programs/README.md` for build prerequisites (Rust, Solana CLI, Anchor CLI).

```bash
# From project root
anchor build   # Requires: cargo-build-sbf (Solana CLI)
anchor keys sync   # After first build, sync program ID
```

Add to workspace `Cargo.toml` / `Anchor.toml` as needed.

### 1.2 Program Design (2-of-3 Multisig)

**Three signers:** buyer, seller, arbiter (platform admin). **Any 2 can push** release or refund.

- **Happy path:** Buyer + seller agree → release (to seller) or refund (to buyer)
- **Dispute:** Arbiter + buyer/seller break tie (arbiter only signs when parties can't agree)

**Escrow Account (PDA)**

- **Seeds:** `[b"escrow", listing_id, buyer, seller, arbiter]`
- **Fields:** buyer, seller, arbiter, listing_id, amount_lamports, bump, state

**Instructions**

| Instruction | Signers | Logic |
|-------------|---------|-------|
| `deposit` | Buyer | Create escrow PDA with arbiter; transfer SOL; init = Deposited |
| `mark_shipped` | Seller | Set state = Shipped (optional) |
| `release` | **2 of 3** (buyer, seller, arbiter) | Transfer to seller; state = Completed |
| `refund` | **2 of 3** (buyer, seller, arbiter) | Transfer back to buyer; state = Refunded |

**Env:** `NEXT_PUBLIC_ESCROW_ARBITER_WALLET` = platform arbiter pubkey (required for deposit).

### 1.3 Anchor Program Sketch

```rust
// programs/fsbd-escrow/src/lib.rs (conceptual)

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: seller wallet
    pub seller: UncheckedAccount<'info>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Escrow::SIZE,
        seeds = [b"escrow", listing_id.as_bytes(), buyer.key().as_ref(), seller.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = escrow.buyer == buyer.key(),
        constraint = escrow.seller == seller.key(),
        seeds = [b"escrow", escrow.listing_id.as_ref(), escrow.buyer.as_ref(), escrow.seller.as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: seller receives funds
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
```

### 1.4 Environment

- `ANCHOR_PROGRAM_ID` / `FSBD_ESCROW_PROGRAM_ID` — set after `anchor keys list`
- Add to `.env` and Vercel

---

## Phase 2: Testing

### 2.1 Unit Tests (LiteSVM / Anchor)

```bash
anchor test
```

Cover:

- `deposit` creates escrow and holds funds
- `release` moves funds to seller when buyer signs
- `refund` returns funds to buyer
- Unauthorized signers cannot release/refund

### 2.2 Integration (Surfpool / Devnet)

1. Deploy: `anchor deploy --provider.cluster devnet`
2. Run a full flow: create listing → agree escrow in chat → deposit → mark shipped → release
3. Confirm balances on Solana Explorer

### 2.3 Risk Checklist

- [ ] Escrow PDA seeds are unique per (listing, buyer, seller)
- [ ] Only buyer can `release`; buyer or admin can `refund`
- [ ] Token vs SOL paths both tested
- [ ] 5% insurance: decide if it stays in escrow or goes to platform vault

---

## Phase 3: Client Integration

### 3.1 Swap PDA Derivation

- **Before:** `createUserEscrowPDA` (SystemProgram seeds)
- **After:** Derive escrow PDA using **your program ID** and seeds `["escrow", listingId, buyer, seller]`

### 3.2 New Module: `lib/escrow-program.ts`

```typescript
// Pseudo-code
import { PublicKey } from '@solana/web3.js'

const FSBD_ESCROW_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID!)

export async function getEscrowPDA(
  listingId: string,
  buyer: PublicKey,
  seller: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      Buffer.from(listingId.slice(0, 32)),
      buyer.toBuffer(),
      seller.toBuffer(),
    ],
    FSBD_ESCROW_PROGRAM_ID
  )
}
```

### 3.3 Deposit Flow

- Replace `transferToUserEscrowTx` with Anchor `deposit` instruction
- Build tx with `@coral-xyz/anchor` or raw instruction data
- OptionalEscrowSection already fetches `purchase-params?escrow=1` (includes 5%)

### 3.4 Release Flow

- On "Confirm Receipt", call Anchor `release` instruction
- Buyer signs; program transfers from escrow PDA to seller

### 3.5 Refund / Dispute

- Add "Request refund" for buyer (e.g. item not shipped)
- `dispute` sets state; admin tool can trigger `refund` after review

---

## Phase 4: Re-enable UI

### 4.1 Uncomment / Show Escrow

1. **ListingDetail.tsx** — uncomment or render `OptionalEscrowSection` where you have "Escrow hidden until program launch"
2. **ListingChat.tsx** — show escrow propose/accept buttons
3. **Profile** — show escrows section

### 4.2 Wire ListingChatSection → OptionalEscrowSection

Ensure when both parties agree in chat, the listing detail shows the escrow deposit button and passes `threadId`, `escrowAgreed`, `escrowStatus`, `userRole`.

### 4.3 Feature Flag (Optional)

```env
NEXT_PUBLIC_ESCROW_ENABLED=true
```

Gate escrow UI on this so you can disable quickly if needed.

---

## Phase 5: Launch and Monitoring

1. Deploy program to **devnet** first
2. Test with real wallets (Phantom devnet)
3. Deploy to **mainnet** when ready
4. Monitor:
   - Failed txs (wrong signer, insufficient funds)
   - Stuck escrows (state mismatch)
   - Dispute rate

---

## File Checklist

| Task | File(s) |
|------|---------|
| Create Anchor program | `programs/fsbd-escrow/` |
| Add `deposit`, `release`, `refund` | `programs/fsbd-escrow/src/lib.rs` |
| Unit tests | `programs/fsbd-escrow/tests/` |
| Client PDA + instructions | `app/lib/escrow-program.ts` |
| Update OptionalEscrowSection | `app/components/OptionalEscrowSection.tsx` |
| Update release flow | `app/components/OptionalEscrowSection.tsx` (handleConfirmReceipt) |
| Re-enable escrow UI | `ListingDetail.tsx`, `ListingChat.tsx`, `profile/page.tsx` |
| Env vars | `NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID`, `NEXT_PUBLIC_ESCROW_ARBITER_WALLET`, `NEXT_PUBLIC_ESCROW_ENABLED` |

---

## Solana SKILL References

- **Anchor:** [programs-anchor.md](https://solana.com/docs) (from SKILL)
- **Testing:** LiteSVM for unit tests; Surfpool for integration
- **Payments:** [payments.md](https://solana.com/docs) for patterns
- **Security:** [security.md](https://solana.com/docs) checklist before mainnet

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Phase 1: Anchor program | 2–4 days |
| Phase 2: Testing | 1–2 days |
| Phase 3: Client integration | 1–2 days |
| Phase 4: Re-enable UI | 0.5 day |
| Phase 5: Devnet → mainnet | 1–2 days |

**Total:** ~1–2 weeks for a careful rollout.
