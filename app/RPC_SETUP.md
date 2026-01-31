# Solana RPC Setup (Fix 403 Access Forbidden)

The **403 "Access forbidden"** error during purchases happens because the default public Solana RPC (`api.mainnet-beta.solana.com` / `api.devnet.solana.com`) rate-limits and blocks production traffic.

## Fix: Use a Dedicated RPC Provider

Add a free RPC URL with an API key to your Vercel project.

### Option 1: Helius (Recommended – Free Tier)

1. Go to [https://www.helius.dev/](https://www.helius.dev/) and sign up
2. Create a new project and copy your **API Key**
3. In **Vercel** → your project → **Settings** → **Environment Variables**, add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY` |
   | `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` |

   **For devnet testing:**
   - `NEXT_PUBLIC_RPC_URL` = `https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY`
   - `NEXT_PUBLIC_SOLANA_NETWORK` = `devnet` (or leave unset)

4. **Redeploy** the project so the new env vars are applied

### Option 2: QuickNode

1. Sign up at [https://www.quicknode.com/](https://www.quicknode.com/)
2. Create a Solana endpoint (mainnet or devnet)
3. Copy the HTTP Provider URL (includes your API key)
4. Set `NEXT_PUBLIC_RPC_URL` in Vercel to that URL

### Option 3: Alchemy

1. Sign up at [https://www.alchemy.com/](https://www.alchemy.com/)
2. Create a Solana app
3. Copy the HTTPS URL from the dashboard
4. Set `NEXT_PUBLIC_RPC_URL` in Vercel to that URL

---

After adding the env var, trigger a redeploy (push a commit or use “Redeploy” in the Vercel dashboard).
