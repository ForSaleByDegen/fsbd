# Deploy FSBD Escrow Contract

Escrow program (2-of-3 multisig) for optional purchase escrow. Deploy to **devnet** first, then **mainnet**.

---

## Prerequisites

### 1. Install Solana CLI (required for `anchor build`)

**Windows (Command Prompt as Admin):**
```cmd
cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"
C:\solana-install-tmp\solana-install-init.exe stable
```
Then add `%USERPROFILE%\.local\solana\install\active_release\bin` to PATH.

**macOS/Linux:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

Verify:
```bash
solana --version
cargo build-sbf --version
```

### 2. Install Anchor CLI (already installed: 0.30.0)

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.0
avm use 0.30.0
```

### 3. Create/Configure Wallet

```bash
# Generate new keypair (if needed)
solana-keygen new

# Or use existing
# Default: ~/.config/solana/id.json

# Airdrop devnet SOL (for deploy)
solana config set --url devnet
solana airdrop 2
solana balance
```

---

## Build

```bash
# From repo root
anchor build
```

If build succeeds, program keypair is at `target/deploy/fsbd_escrow-keypair.json`.

---

## Sync Program ID (First Time)

```bash
anchor keys list
# Shows program ID from keypair

anchor keys sync
# Writes program ID into declare_id! and Anchor.toml
# Re-run anchor build after sync
anchor build
```

---

## Deploy to Devnet

```bash
# Ensure cluster is devnet
solana config set --url devnet

# Deploy
anchor deploy --provider.cluster devnet
```

Record the **Program ID** from the output. Add to `.env`:

```
NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID=<program-id>
NEXT_PUBLIC_ESCROW_ARBITER_WALLET=<your-admin-wallet-pubkey>
```

---

## Deploy to Mainnet

1. Ensure wallet has enough SOL for deployment (~2–3 SOL)
2. Switch cluster and deploy:

```bash
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet-beta
```

3. Add same env vars in Vercel (production).

---

## Env Vars (App)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID` | Escrow program pubkey (after deploy) |
| `NEXT_PUBLIC_ESCROW_ARBITER_WALLET` | Platform admin wallet (2-of-3 signer) |
| `PROTECTION_POOL_WALLET` | Multisig for 5% insurance fees |
| `CRON_SECRET` | For escrow-deadlines cron |

---

## Deploy via GitHub Actions (no local Solana CLI)

1. Push to `main` (or trigger "Build Escrow Program" workflow manually)
2. Workflow builds and uploads `fsbd_escrow.so` as artifact
3. Download artifact, then deploy locally:
   ```bash
   solana config set --url devnet
   solana program deploy --program-id <path-to-keypair> fsbd_escrow.so
   ```
   Or use a wallet with SOL: `solana program deploy fsbd_escrow.so` (uses new program ID)

---

## Client Integration (After Deploy)

Once deployed, wire `app/lib/user-pda-wallet.ts` (or `OptionalEscrowSection`) to use the Anchor program:

1. Replace `transferToUserEscrowTx` with Anchor `deposit` instruction
2. PDA seeds: `["escrow", listingId32, buyer, seller, arbiter]`
3. See `app/lib/escrow-program.ts` for `getEscrowPDA`, `listingIdToSeed`

The current flow still uses the placeholder PDA; funds will be held by the **Anchor escrow PDA** once integrated.
