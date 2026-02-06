# FSBD Escrow Program

Anchor program for optional purchase escrow. Holds SOL until buyer confirms receipt.

## Prerequisites

1. **Rust** – https://rustup.rs
2. **Solana CLI** – `cargo install solana-cli` or from https://docs.solana.com/cli/install-solana-cli-tools  
   (Provides `cargo build-sbf` for program builds)
3. **Anchor CLI** – `cargo install --git https://github.com/coral-xyz/anchor avm --locked` then `avm install 0.30.0`

## Build

```bash
# From repo root
anchor build
```

## Program ID

Before first deploy, run:

```bash
anchor keys list
anchor keys sync
```

This syncs the program ID from `target/deploy/fsbd_escrow-keypair.json` into `declare_id!` and `Anchor.toml`.

## Instructions (2-of-3 Multisig)

- **deposit** – Buyer deposits SOL; escrow stores buyer, seller, arbiter
- **release** – **2 of 3** (buyer, seller, arbiter) sign → funds to seller
- **refund** – **2 of 3** sign → funds back to buyer
- **mark_shipped** – Seller only; optional status

Arbiter = platform admin; only signs when buyer/seller disagree.

## Client Integration

See `app/lib/escrow-program.ts` (to be created) and `app/ESCROW_BUILD_PLAN.md`.
