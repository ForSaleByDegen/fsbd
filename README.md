# For Sale By Degen ($FSBD)

Anonymous decentralized marketplace on Solana. Craigslist-like classifieds with crypto payments, local pickup or ship, optional escrow, and tiered access via $FSBD holdings.

**Privacy-First**: No tracking, no analytics, no data sharing. Wallet-only authentication.

**Live**: [fsbd.fun](https://fsbd.fun)

## Features

- 🔐 **Wallet Authentication**: Connect with Solana wallets (Phantom, Solflare) - no emails, no passwords
- 📝 **Listings**: Create, view, search classified-style listings with IPFS images
- 💰 **Crypto Payments**: SOL/USDC payments with basic escrow
- 🪙 **Token Launching**: Optional SPL token creation for listings (fun/marketing only)
- 🎯 **Tiered Access**: Hold $FSBD to unlock fee reductions and premium features
- 🔒 **Privacy**: Wallet addresses hashed, encrypted storage, no tracking

## Tech Stack

- **Frontend**: Next.js 14 App Router, React, TypeScript
- **UI**: Tailwind CSS, shadcn/ui components
- **Blockchain**: @solana/web3.js, @solana/spl-token, @solana/wallet-adapter
- **Database**: Supabase (PostgreSQL) or API routes fallback
- **Storage**: IPFS for images
- **Payments**: Solana Pay integration

## Quick Start

### Prerequisites

- Node.js 18+
- Solana wallet (Phantom recommended)
- Supabase account (optional - can use API routes)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```env
# Solana
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# $FBSD Token (TODO: Replace after launch)
NEXT_PUBLIC_FBSD_TOKEN_MINT=FBSD_TOKEN_MINT_PLACEHOLDER

# App Wallet
NEXT_PUBLIC_APP_WALLET=YOUR_WALLET_ADDRESS

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Encryption
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-char-key
```

### Supabase Setup (Optional)

1. Create a Supabase project at https://supabase.com
2. Run this SQL to create the listings table:

```sql
create table listings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  category text not null,
  price numeric not null,
  price_token text default 'SOL',
  images text[],
  wallet_address_hash text not null,
  wallet_address text not null, -- Encrypted in app
  has_token boolean default false,
  token_mint text,
  token_name text,
  token_symbol text,
  fee_paid numeric default 0,
  status text default 'active',
  buyer_wallet_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index listings_status_idx on listings(status);
create index listings_category_idx on listings(category);
create index listings_wallet_hash_idx on listings(wallet_address_hash);
create index listings_created_at_idx on listings(created_at desc);
```

3. Enable Row Level Security (RLS) if needed
4. Add your Supabase URL and anon key to `.env`

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Testing on Devnet

1. Switch wallet to Solana Devnet
2. Get free devnet SOL: https://faucet.solana.com
3. Test creating listings and payments

## Project Structure

```
app/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home/feed
│   ├── listings/
│   │   ├── create/        # Create listing
│   │   ├── [id]/          # Listing detail
│   │   └── my/            # User's listings
│   └── tiers/             # Tier information
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── Header.tsx
│   ├── ListingCard.tsx
│   ├── CreateListingForm.tsx
│   └── ...
├── lib/
│   ├── tier-check.ts      # $FBSD balance & tier logic
│   ├── supabase.ts        # Database client
│   ├── ipfs.ts            # IPFS upload
│   └── token-ops.ts        # Token creation
└── ...
```

## Key Features

### Tier System

Hold $FSBD tokens to unlock tiers:

- **Free**: Free listings (message signing only), 0.42% platform fee
- **Bronze** (100,000 $FSBD): 25% fee reduction, auction creation
- **Silver** (1,000,000 $FSBD): 50% fee reduction, priority visibility
- **Gold** (10,000,000 $FSBD): 75% fee reduction, priority visibility

Tiers are checked on-chain—no data sharing, fully private.

### Privacy & Security

- ✅ Wallet addresses hashed before storage
- ✅ Encrypted sensitive data
- ✅ No tracking cookies or analytics
- ✅ Input validation and XSS prevention
- ✅ Rate limiting on API routes
- ✅ Anonymous by design

### Disclaimers

This is an **experimental side project MVP**. Not financial advice. $FBSD is a utility token only. Use at your own risk. All transactions are final. No guarantees or warranties.

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Works with any platform supporting Next.js:
- Netlify
- Railway
- Render

## $FSBD Token Launch

```bash
cd app
KEYPAIR_PATH=./your-keypair.json npm run launch-fsbd-token
# Set NEXT_PUBLIC_FSBD_TOKEN_MINT to the output mint address
```

See [app/TOKEN_LAUNCH_SETUP.md](app/TOKEN_LAUNCH_SETUP.md) for details.

## Hackathon

See [HACKATHON.md](HACKATHON.md) for submission info.

## Security Notes

- Change `NEXT_PUBLIC_ENCRYPTION_KEY` in production
- Use your own IPFS node for production
- Set up proper RLS in Supabase
- Review all Solana transactions before signing
- Test thoroughly on devnet before mainnet

## License

MIT

---

**Built anonymously. No tracking. No data sharing. Wallet-only.**
