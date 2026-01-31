# Step-by-Step Setup Guide

## Part 1: Prepare for GitHub

### Step 1: Initialize Git (Already Done ✅)
```bash
git init
```

### Step 2: Create Initial Commit
```bash
git add .
git commit -m "Initial commit - For Sale By Degen with Auctions"
```

### Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `for-sale-by-degen` (or any name you like)
3. Description: "Anonymous decentralized marketplace on Solana"
4. Choose: **Public** or **Private**
5. **DO NOT** initialize with README (we already have one)
6. Click **"Create repository"**

### Step 4: Connect and Push

After creating the repo, GitHub will show you commands. Use these:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO_NAME` with your repository name

---

## Part 2: Deploy to Vercel

### Step 1: Go to Vercel

1. Visit https://vercel.com
2. Sign in with GitHub (easiest)

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find your repository in the list
3. Click **"Import"**

### Step 3: Configure Project

**IMPORTANT SETTINGS:**

1. **Framework Preset**: Should auto-detect "Next.js" ✅
2. **Root Directory**: Click "Edit" → Set to `app` ⚠️ **CRITICAL**
3. **Build Command**: Leave default (`npm run build`)
4. **Output Directory**: Leave default (`.next`)
5. **Install Command**: Leave default (`npm install`)

### Step 4: Add Environment Variables

Before clicking "Deploy", click **"Environment Variables"** and add:

**Required Variables:**
```
NEXT_PUBLIC_SOLANA_NETWORK = devnet
NEXT_PUBLIC_RPC_URL = https://api.devnet.solana.com
NEXT_PUBLIC_FBSD_TOKEN_MINT = FBSD_TOKEN_MINT_PLACEHOLDER
NEXT_PUBLIC_APP_WALLET = 11111111111111111111111111111111
NEXT_PUBLIC_ENCRYPTION_KEY = default-key-change-in-production
```

**Optional (but recommended):**
```
NEXT_PUBLIC_NFT_STORAGE_KEY = (get from https://nft.storage - free)
```

Click **"Add"** for each variable.

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Your app will be live! 🎉

---

## Part 3: Test Your App

### Step 1: Open Your Live App

Vercel will give you a URL like: `https://your-project.vercel.app`

### Step 2: Connect Wallet

1. Click **"Select Wallet"** in header
2. Choose **Phantom** (or Solflare)
3. **IMPORTANT**: Switch wallet to Devnet:
   - Phantom: Settings → Developer Mode → Testnet
   - Solflare: Settings → Network → Devnet

### Step 3: Get Devnet SOL

1. Copy your wallet address
2. Go to https://faucet.solana.com
3. Paste address and request SOL
4. Wait ~30 seconds

### Step 4: Test Features

1. **Check Tiers**: Click "Tiers" → Should show "Free" tier
2. **Create Listing**: Click "Create Listing" → Fill form → Pay fee
3. **Create Auction**: Click "Create Auction" → Will show gating (need Bronze+)
4. **View Listings**: Browse the feed

---

## Troubleshooting

### Build Fails on Vercel

**Check:**
- Root Directory is set to `app` ✅
- All environment variables are added ✅
- Check build logs in Vercel dashboard

### Wallet Won't Connect

**Check:**
- Wallet is on Devnet (not Mainnet)
- Browser console for errors
- Try refreshing page

### Images Won't Upload

**Check:**
- `NEXT_PUBLIC_NFT_STORAGE_KEY` is set in Vercel
- Get free key from https://nft.storage

### Can't Create Auctions

**This is normal!** Auctions require Bronze+ tier (1,000+ $FBSD tokens).
- You can still create regular listings
- To test auctions, you'd need to get $FBSD tokens or temporarily modify tier check

---

## Next Steps After Deployment

1. ✅ Test all features
2. ✅ Share your app URL
3. ✅ Get NFT.Storage key for image uploads
4. ✅ (Optional) Set up Supabase for database
5. ✅ (Optional) Deploy $FBSD token and update mint address

---

## Quick Commands Reference

```bash
# Git commands
git add .
git commit -m "Your message"
git push

# Local testing (if needed)
cd app
npm install
npm run dev
```

---

**You're all set! Your app will be live in minutes! 🚀**
