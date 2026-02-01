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

---

## Wallet won't connect in PWA / "No wallet detected"

**Cause:** In standalone PWA mode, wallet extensions (Phantom, Solflare) may not inject properly. On mobile, there are no browser extensions—only in-app browsers like Phantom's.

**Fix:**
1. **Open in browser:** Use the "Open in browser" link (shown when no wallet is detected), or visit fsbd.fun directly in Chrome/Safari.
2. **Mobile:** Open fsbd.fun inside Phantom's in-app browser (Phantom → Browser tab) so the wallet is available.
3. **PWA display:** The app uses `display: browser` so it opens in a normal tab when launched from home screen—extensions should inject.
4. **Phantom + Solflare:** Both adapters are included; ensure the extension is installed and enabled.

---

## "This Connection Is Not Private" / iCloud Private Relay (iPhone/iPad)

**Error shown to user:** "iCloud Private Relay is unable to hide your IP address from this site. By continuing to www.fsbd.fun your IP address will be revealed."

**Cause:** Apple's iCloud Private Relay sometimes fails to anonymize connections to certain sites. This can happen with Vercel + custom domains, DNS setup, or SSL quirks. The site itself is safe—Private Relay just can't provide full anonymity for this visit.

### Tell your users (immediate workaround)

On iPhone/iPad in Safari:
1. Tap **"Show IP Address"** to proceed. The site will load; only that visit won't use Private Relay.
2. Or tap **"Reduce Protections"** in the banner at the top, then reload.

### What you can try (site owner)

1. **Vercel Domains:** Ensure both `fsbd.fun` and `www.fsbd.fun` are added and show valid SSL.
2. **Redirect:** Set one as primary and redirect the other. Sometimes `fsbd.fun` (no www) works when `www.fsbd.fun` triggers the warning—have users try the root domain.
3. **Redeploy:** Trigger a fresh deployment to refresh SSL/certs.
4. **DNS:** Confirm A/CNAME records match Vercel's instructions; propagation can take up to 48h.

This is a known compatibility quirk between iCloud Private Relay and some hosting setups. "Show IP Address" is the standard Apple-provided way for users to proceed safely.
