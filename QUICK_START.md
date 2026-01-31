# Quick Start Guide - For Sale By Degen

## Option 1: Deploy to Vercel (Recommended - No Localhost Issues!)

### Step 1: Push to GitHub

```bash
# In your project root (c:\Users\dusti\OneDrive\Desktop\FSBD)
git init
git add .
git commit -m "Initial commit - For Sale By Degen with Auctions"
git branch -M main

# Create a new repo on GitHub, then:
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **IMPORTANT**: Set **Root Directory** to `app`
5. Click **"Configure Project"**

### Step 3: Add Environment Variables

In Vercel → Your Project → Settings → Environment Variables, add:

**Required:**
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_FBSD_TOKEN_MINT=FBSD_TOKEN_MINT_PLACEHOLDER
NEXT_PUBLIC_APP_WALLET=YOUR_WALLET_ADDRESS_HERE
NEXT_PUBLIC_ENCRYPTION_KEY=change-this-to-random-32-chars!!
```

**Optional (for full features):**
```
NEXT_PUBLIC_NFT_STORAGE_KEY=your_nft_storage_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_DEV_WALLET_SECRET=[...array...]
```

### Step 4: Deploy!

Click **"Deploy"** and wait 2-3 minutes.

Your app will be live at: `https://your-project.vercel.app` 🎉

---

## Option 2: Test Locally (If You Want)

### Step 1: Install Dependencies

```bash
cd app
npm install
```

This will take 2-5 minutes.

### Step 2: Set Up Environment

Copy `.env.example` to `.env` and fill in values:

```bash
# In app folder
cp .env.example .env
```

Edit `.env` with your values (at minimum, you need the Solana config).

### Step 3: Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

---

## What You'll See

### Home Page
- "$FBSD" header with wallet connect button
- Yellow disclaimer banner
- "For Sale By Degen" title
- Search bar and category filters
- Empty listings feed (until you create listings)

### Features to Test

1. **Connect Wallet**
   - Click "Select Wallet" → Connect Phantom/Solflare
   - Switch wallet to **Devnet** (important!)

2. **Check Your Tier**
   - Click "Tiers" in header
   - Will show "Free" tier (until you get $FBSD tokens)

3. **Create Regular Listing**
   - Click "Create Listing"
   - Fill form → Pay fee → Submit

4. **Create Auction** (Bronze+ tier required)
   - Click "Create Auction"
   - If Free tier: Will show gating message
   - If Bronze+: Can create auction with token launch

5. **Place Bids** (on auctions)
   - View auction listing
   - Enter bid amount
   - Place bid (creates PDA escrow)

---

## Quick Setup for Testing

### Get Devnet SOL
1. Switch Phantom to Devnet (Settings → Developer Mode → Testnet)
2. Get free SOL: https://faucet.solana.com
3. Enter your wallet address

### Get NFT.Storage Key (for image uploads)
1. Go to https://nft.storage
2. Sign up (free)
3. Copy API key
4. Add to `.env` or Vercel: `NEXT_PUBLIC_NFT_STORAGE_KEY=your_key`

### Set Up Supabase (Optional - for database)
1. Go to https://supabase.com
2. Create free project
3. Run SQL from README to create `listings` table
4. Add URL and key to environment variables

---

## Troubleshooting

### "Cannot connect to localhost:3000"
- Use Vercel deployment instead (no firewall issues)
- Or check if port 3000 is in use: `netstat -ano | findstr :3000`

### "Wallet connection failed"
- Make sure wallet is on Devnet (not Mainnet)
- Check browser console for errors

### "Tier check failed"
- This is normal if you don't have $FBSD tokens yet
- You'll be on "Free" tier (can create regular listings, not auctions)

### "NFT.Storage upload failed"
- Make sure you added `NEXT_PUBLIC_NFT_STORAGE_KEY` to environment
- Check NFT.Storage dashboard for API key

### "Database error"
- If using Supabase: Check connection string
- If not using Supabase: App falls back to API routes (may lose data on refresh)

---

## Recommended: Vercel Deployment

Since you prefer Vercel, I recommend:
1. Push to GitHub (5 minutes)
2. Deploy on Vercel (2 minutes)
3. Add environment variables (1 minute)
4. Done! No localhost, no firewall issues

Your app will be live and accessible from anywhere! 🚀
