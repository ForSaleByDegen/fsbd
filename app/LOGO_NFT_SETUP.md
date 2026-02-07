# FSBD Logo NFT – SNS Avatar & User Minting

Low-cost (~$2) open mint. A small token of appreciation for our users. Nothing is promised from minting.

## One-time setup

1. **Run the script** to pin metadata and mint your SNS copy:
   ```bash
   cd app && npm run mint-logo-nft
   ```

2. **Add env vars** from the script output:
   - `LOGO_NFT_METADATA_URI` – printed by the script (IPFS metadata URL)
   - `LOGO_NFT_TREASURY` – wallet address to receive the 0.01 SOL mint fee
   - `MINT_LOGO_KEYPAIR` or `KEYPAIR_PATH` – same keypair used for minting

3. **SNS avatar:** Use the mint address printed by the script at sns.id → fsbd.sol → Edit Avatar → Change from NFT.

## User minting (open, ~$2)

- **Page:** `/mint-logo`
- **Flow:** User signs payment (0.01 SOL to treasury) → we verify → we mint and send NFT to their wallet
- **Disclaimer:** Shown on the page – "Nothing is promised. Just a collectible to show support."

## Env vars

| Var | Purpose |
|-----|---------|
| `LOGO_NFT_METADATA_URI` | IPFS metadata URL (from `npm run mint-logo-nft`) |
| `LOGO_NFT_TREASURY` | Wallet that receives the 0.01 SOL mint fee |
| `MINT_LOGO_KEYPAIR` | Keypair for minting (or use `KEYPAIR_PATH`) |
| `PINATA_JWT` | For the script to pin metadata (one-time) |
