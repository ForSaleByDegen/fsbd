# Deploying to Vercel

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - For Sale By Degen"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Deploy to Vercel

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `app` (important!)
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `.next` (default)

**Option B: Via Vercel CLI**
```bash
npm i -g vercel
cd app
vercel
```

### 3. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_FBSD_TOKEN_MINT=FBSD_TOKEN_MINT_PLACEHOLDER
NEXT_PUBLIC_APP_WALLET=YOUR_APP_WALLET_ADDRESS
NEXT_PUBLIC_ENCRYPTION_KEY=your-32-character-key-here!!
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url (optional)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key (optional)
```

### 4. Deploy!

Click "Deploy" and wait for build to complete.

## Important Notes

- **Root Directory**: Make sure Vercel knows the app is in the `app/` folder
- **Build Command**: Should be `cd app && npm install && npm run build` if root is project root
- **Environment Variables**: All `NEXT_PUBLIC_*` vars need to be set in Vercel

## After Deployment

Your app will be live at: `https://your-project.vercel.app`

You can test:
- Wallet connection
- Creating listings
- Viewing tiers
- All features work the same as localhost!
