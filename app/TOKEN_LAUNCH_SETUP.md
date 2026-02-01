# $FSBD Token Launch

Launch the $FSBD platform token for tier gating and fee discounts.

## 1. Prerequisites

- Node.js 18+
- Solana CLI (optional, for keypair): `solana-keygen new`
- SOL in your wallet (devnet or mainnet)

## 2. Create or use a keypair

Your keypair will be the **mint authority** and receive the full initial supply.

```bash
# Create new keypair (save the path)
solana-keygen new -o ./fsbd-mint-authority.json
```

Or use an existing wallet JSON keypair file.

## 3. Run the launch script

```bash
cd app
KEYPAIR_PATH=./fsbd-mint-authority.json npm run launch-fsbd-token
```

For devnet (default if RPC is devnet):
```bash
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com KEYPAIR_PATH=./fsbd-mint-authority.json npm run launch-fsbd-token
```

For mainnet:
```bash
NEXT_PUBLIC_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY KEYPAIR_PATH=./fsbd-mint-authority.json npm run launch-fsbd-token
```

## 4. Set the mint address

The script outputs:
```
NEXT_PUBLIC_FSBD_TOKEN_MINT=<mint_address>
```

Add this to:
- `.env` and `.env.local`
- Vercel project environment variables

## 5. Verify

- Solana Explorer: `https://explorer.solana.com/address/<mint_address>`
- After setting the env, tier checks will use the real $FSBD balance.

## Supply & tiers

- **Supply**: 1 billion $FSBD (9 decimals)
- **Bronze**: 100,000+ $FSBD
- **Silver**: 1,000,000+ $FSBD
- **Gold**: 10,000,000+ $FSBD

## Security

- Keep your mint authority keypair safe.
- The script mints the full supply to your wallet. Distribute as needed (airdrops, DEX listing, etc.).
- Never commit keypair files to git.
