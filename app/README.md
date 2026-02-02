# For Sale By Degen ($FSBD)

Anonymous decentralized marketplace on Solana.

## Quick Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Import GitHub repository
3. **Set Root Directory to `app`** ⚠️
4. Add environment variables (see below)
5. Deploy!

### 3. Environment Variables (in Vercel)

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_FSBD_TOKEN_MINT=FSBD_TOKEN_MINT_PLACEHOLDER
NEXT_PUBLIC_APP_WALLET=YOUR_WALLET_ADDRESS
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-char-key-here!!
```

Optional (Supabase):
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Local Development (if needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Features

- Wallet-only authentication
- Create/view/search listings
- IPFS image storage (EXIF/metadata stripped before upload)
- $FSBD tier system
- Optional token launching
- Privacy-first: encrypted chat, no shipping address storage, image metadata stripped

See [PRIVACY_DATA_PROTECTION.md](PRIVACY_DATA_PROTECTION.md) for details on data protection.

## Tech Stack

- Next.js 14 App Router
- Solana Wallet Adapter
- shadcn/ui + Tailwind
- Supabase (optional)
- IPFS
