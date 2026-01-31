# Deploy to Vercel - Final Steps

## ✅ Your code is on GitHub!

Repository: https://github.com/ForSaleByDegen/fsbd

---

## Step 1: Go to Vercel

1. Visit: https://vercel.com
2. Click **"Sign Up"** or **"Log In"**
3. **Best**: Sign in with GitHub (one-click)

## Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. You should see your repositories
3. Find **"fsbd"** (or search for "ForSaleByDegen")
4. Click **"Import"**

## Step 3: Configure Project ⚠️ CRITICAL

**BEFORE clicking Deploy**, click **"Configure Project"**:

1. **Framework Preset**: Should say "Next.js" ✅
2. **Root Directory**: 
   - Click **"Edit"**
   - Change from `/` to `app`
   - Click **"Continue"**
3. **Build Command**: `npm run build` ✅
4. **Output Directory**: `.next` ✅
5. **Install Command**: `npm install` ✅

## Step 4: Add Environment Variables

Click **"Environment Variables"** and add these:

| Variable Name | Value |
|--------------|-------|
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
| `NEXT_PUBLIC_RPC_URL` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_FBSD_TOKEN_MINT` | `FBSD_TOKEN_MINT_PLACEHOLDER` |
| `NEXT_PUBLIC_APP_WALLET` | `11111111111111111111111111111111` |
| `NEXT_PUBLIC_ENCRYPTION_KEY` | `default-key-change-in-production` |

**Optional** (for image uploads):
| Variable Name | Value |
|--------------|-------|
| `NEXT_PUBLIC_NFT_STORAGE_KEY` | Get from https://nft.storage (free) |

Click **"Add"** after each variable.

## Step 5: Deploy! 🚀

1. Click **"Deploy"** button
2. Wait 2-3 minutes
3. Watch the build logs
4. When done, you'll get: `https://fsbd-xxxxx.vercel.app`

---

## Step 6: Test Your Live App

1. Open the Vercel URL
2. Click **"Select Wallet"** → Connect Phantom
3. **Switch Phantom to Devnet** (Settings → Developer Mode → Testnet)
4. Get devnet SOL: https://faucet.solana.com
5. Test creating listings!

---

## Security Note

Your GitHub token was used in the command. For future pushes, consider:
- Using GitHub Desktop (handles auth automatically)
- Or Git Credential Manager (stores token securely)
- Or SSH keys (most secure)

You can also revoke and regenerate the token if needed.

---

**Your app will be live in minutes! 🎉**
