# Helius Backrun Rebates

When using Helius RPC on mainnet, users can earn **50% of MEV** from their transactions via post-trade backruns. No extra risk—your tx executes first.

## How It Works

- **Opt-in**: We add `rebate-address` (the signer's wallet) to `sendTransaction` calls
- **Who earns**: The user who signs the transaction (buyer on purchases, depositor on escrow, seller on token listing)
- **When**: Only on mainnet with `NEXT_PUBLIC_RPC_URL` containing `helius`

## Setup

Use Helius RPC in Vercel:

```
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

Rebates are automatic—no additional config.

## Details

- [Helius docs](https://www.helius.dev/docs/backrun-rebates)
- Single-transaction mainnet requests only; devnet and batch calls are skipped
- Your transaction always executes first; MEV is extracted after
