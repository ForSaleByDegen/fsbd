# GitHub & Vercel Setup - Step by Step

## ✅ Step 1: Git Initialized (Done!)

Your repository is ready. Now let's push to GitHub.

---

## Step 2: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `for-sale-by-degen` (or any name you prefer)
3. **Description**: "Anonymous decentralized marketplace on Solana with auctions"
4. **Visibility**: Choose **Public** or **Private**
5. **IMPORTANT**: 
   - ❌ **DO NOT** check "Add a README file"
   - ❌ **DO NOT** add .gitignore (we already have one)
   - ❌ **DO NOT** choose a license (we have LICENSE file)
6. Click **"Create repository"**

---

## Step 3: Connect to GitHub

After creating the repo, GitHub will show you commands. **Copy the repository URL** (looks like):
```
https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

Then run these commands (replace with your actual URL):

```bash
cd c:\Users\dusti\OneDrive\Desktop\FSBD
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

**If you get authentication errors:**
- Use GitHub Personal Access Token instead of password
- Or use GitHub Desktop app
- Or use SSH keys

---

## Step 4: Deploy to Vercel

### 4a. Go to Vercel

1. Visit: https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. **Best option**: Sign in with GitHub (one-click)

### 4b. Import Your Project

1. Click **"Add New..."** → **"Project"**
2. You should see your GitHub repositories
3. Find `for-sale-by-degen` (or your repo name)
4. Click **"Import"**

### 4c. Configure Project Settings

**CRITICAL**: Before deploying, click **"Configure Project"**:

1. **Framework Preset**: Should say "Next.js" ✅
2. **Root Directory**: 
   - Click **"Edit"**
   - Change from `/` to `app`
   - Click **"Continue"**
3. **Build Command**: Leave as `npm run build` ✅
4. **Output Directory**: Leave as `.next` ✅
5. **Install Command**: Leave as `npm install` ✅

### 4d. Add Environment Variables

**Before clicking "Deploy"**, click **"Environment Variables"**:

Add these one by one:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_FBSD_TOKEN_MINT` | `FBSD_TOKEN_MINT_PLACEHOLDER` |
| `NEXT_PUBLIC_APP_WALLET` | `11111111111111111111111111111111` |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | `default-key-change-in-production` |

**Optional** (for image uploads):
| Name | Value |
|------|-------|
| `NEXT_PUBLIC_NFT_STORAGE_KEY` | Get from https://nft.storage (free) |

Click **"Add"** after each variable.

### 4e. Deploy!

1. Click **"Deploy"** button
2. Wait 2-3 minutes
3. Watch the build logs
4. When done, you'll get a URL like: `https://your-project.vercel.app` 🎉

---

## Step 5: Test Your Live App

### 5a. Open Your App

Click the URL Vercel gives you (or find it in Vercel dashboard)

### 5b. Connect Wallet

1. Click **"Select Wallet"** in header
2. Choose **Phantom**
3. **IMPORTANT**: Switch to Devnet:
   - Open Phantom extension
   - Click settings (gear icon)
   - Enable "Developer Mode"
   - Switch network to "Devnet"

### 5c. Get Devnet SOL

1. Copy your wallet address from Phantom
2. Go to: https://faucet.solana.com
3. Paste address
4. Click "Airdrop 2 SOL"
5. Wait ~30 seconds

### 5d. Test Features

1. **Home Page**: Should see "$FBSD" header, search bar
2. **Tiers**: Click "Tiers" → See your tier (will be "Free")
3. **Create Listing**: Click "Create Listing" → Fill form → Pay fee
4. **Create Auction**: Click "Create Auction" → See gating message (need Bronze+)

---

## Troubleshooting

### "Build Failed" on Vercel

**Check:**
- ✅ Root Directory is set to `app` (not `/`)
- ✅ All environment variables are added
- ✅ Check build logs for specific errors

### "Cannot find module" errors

**Fix:**
- Make sure `package.json` has all dependencies
- Check that `nft.storage` is in dependencies (it should be)

### Wallet Connection Issues

**Fix:**
- Make sure wallet is on **Devnet** (not Mainnet)
- Refresh the page
- Check browser console for errors

### Images Won't Upload

**Fix:**
- Add `NEXT_PUBLIC_NFT_STORAGE_KEY` to Vercel environment variables
- Get free key from https://nft.storage

---

## What's Next?

After deployment:

1. ✅ Test all features
2. ✅ Share your app URL
3. ✅ Get NFT.Storage key for image uploads
4. ✅ (Optional) Set up Supabase for persistent database
5. ✅ (Optional) Deploy $FBSD token and update mint address

---

## Quick Reference

**Your app will be live at:**
```
https://your-project-name.vercel.app
```

**To update code:**
```bash
git add .
git commit -m "Your changes"
git push
```
Vercel will automatically redeploy! 🚀

---

**Ready? Let's push to GitHub first!**
