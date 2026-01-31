# Troubleshooting

## "0.0000 SOL" / Insufficient Balance (when you have SOL in Phantom)

**Cause:** Network mismatch. The app checks balance on one network (usually devnet), but Phantom shows your mainnet balance.

**Fix (choose one):**

### Option A: Use mainnet (real SOL)
1. Vercel → Settings → Environment Variables
2. Set `NEXT_PUBLIC_SOLANA_NETWORK` = `mainnet-beta`
3. Set `NEXT_PUBLIC_RPC_URL` = `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`
4. Redeploy

### Option B: Use devnet (test SOL)
1. In Phantom: Settings → Developer Settings → Change Network to **Devnet**
2. Get free devnet SOL: [faucet.solana.com](https://faucet.solana.com) (select Devnet)
3. Ensure app uses devnet (default): `NEXT_PUBLIC_SOLANA_NETWORK` = `devnet` or unset

---

## Chat stuck on "Loading chat..."

**Cause:** Supabase not configured, or chat tables missing.

**Fix:**
1. Vercel → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key

2. Supabase → SQL Editor → Run `supabase/migration_chat.sql`

3. Redeploy the app

---

## Console: runtime.lastError, MetaMask not found

**Cause:** Browser extensions (Phantom, MetaMask, etc.) inject scripts that can log these errors. They come from the extensions, not from FSBD.

**Fix:** These are harmless. Ignore them, or disable unused wallet extensions for this site.

---

## Manifest 401 / PWA install fails on preview URL

**Cause:** Vercel Deployment Protection blocks unauthenticated requests on preview deployments (e.g. `*-git-main-*.vercel.app`).

**Fix:**
1. Use your production domain (e.g. `fsbd.fun`) — protection usually applies only to preview URLs.
2. Or: Vercel Dashboard → Project → Settings → Deployment Protection → disable for previews or add a bypass.
