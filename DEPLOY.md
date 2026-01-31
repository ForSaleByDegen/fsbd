# Deployment Guide - For Sale By Degen

## Deploy to Vercel (Recommended)

Since you prefer Vercel, here's the quickest way to get it deployed:

### Step 1: Prepare Repository

Make sure your code is in a Git repository:

```bash
# If not already initialized
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:

```bash
git remote add origin YOUR_GITHUB_REPO_URL
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Vercel

**Via Dashboard (Easiest):**

1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **IMPORTANT**: Set **Root Directory** to `app`
5. Configure environment variables (see below)
6. Click **"Deploy"**

**Via CLI:**

```bash
npm i -g vercel
cd app
vercel
# Follow prompts, set root directory to current folder
```

### Step 4: Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**Required:**
```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_FBSD_TOKEN_MINT=FBSD_TOKEN_MINT_PLACEHOLDER
NEXT_PUBLIC_APP_WALLET=YOUR_WALLET_ADDRESS_HERE
NEXT_PUBLIC_ENCRYPTION_KEY=change-this-to-random-32-chars!!
```

**Optional (for Supabase):**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_INFURA_IPFS_AUTH=your_infura_auth (optional)
```

### Step 5: Build Settings

Vercel should auto-detect Next.js, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `app` ⚠️ **CRITICAL**
- **Build Command**: `npm run build` (or `cd app && npm run build` if root is project root)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Troubleshooting

**If build fails:**
- Check that Root Directory is set to `app`
- Verify all environment variables are set
- Check build logs in Vercel dashboard

**If app doesn't load:**
- Verify environment variables are prefixed with `NEXT_PUBLIC_`
- Check browser console for errors
- Ensure RPC URL is accessible

## Alternative: Deploy Backend Separately

If you want to use the Express backend:

1. Deploy backend to Render/Heroku
2. Set `NEXT_PUBLIC_API_URL` in Vercel to your backend URL
3. Or use Supabase (recommended - simpler)

## After Deployment

Your app will be live at: `https://your-project-name.vercel.app`

Test it:
- ✅ Wallet connection works
- ✅ Create listings
- ✅ View tiers
- ✅ All features work!

No localhost needed! 🎉
