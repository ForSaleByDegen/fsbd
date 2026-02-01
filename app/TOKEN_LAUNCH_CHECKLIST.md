# $FSBD Token Launch Checklist

## Pre-Launch

### 1. Launch on pump.fun
1. Go to [pump.fun](https://pump.fun)
2. Create your token (name, symbol, description, image)
3. Copy the **contract address** (mint) after bonding
4. Skip the local script—pump.fun creates and lists the token

**Alternative**: Use the local script (`npm run launch-fsbd-token`) for a manual mint, then add liquidity elsewhere.

### 2. Add Metadata (pump.fun handles this)
If you launched on pump.fun, metadata is set automatically. Otherwise use Metaplex or Token Extensions.

### 3. Lock Mint in Platform
- **Vercel**: Add `NEXT_PUBLIC_FSBD_TOKEN_MINT=<mint_address>` to env vars
- **Admin Panel**: Settings → Platform Config → set **$FSBD Token Mint**
- Redeploy if using env var

---

## Post-Launch

### 4. Verify
- [ ] Explorer: `https://solana.fm/address/<mint>` or `https://explorer.solana.com/address/<mint>`
- [ ] Tier checks: Connect wallet, visit /tiers, confirm balance/tier
- [ ] Auction gate: Try creating auction (requires 10M+ $FSBD)

### 5. Share & Distribute
- [ ] **Buy link**: `https://pump.fun/coin/<YOUR_MINT>` — already linked site-wide (tiers, footer, beta)
- [ ] Airdrop to beta signups (export from `beta_signups`)
- [ ] Submit to [Jupiter](https://station.jup.ag/) for discovery (pump.fun graduates to Raydium)

---

## Beta Mode

While preparing:
- Set `NEXT_PUBLIC_BETA_MODE=true` for landing + signup
- Set `NEXT_PUBLIC_BETA_MODE=false` when ready to go live

---

## Summary

| Step | Status |
|------|--------|
| Launch on pump.fun (or run launch script) | ☐ |
| Set NEXT_PUBLIC_FSBD_TOKEN_MINT | ☐ |
| Set mint in Admin Platform Config | ☐ |
| Verify tiers & Buy link on site | ☐ |
| Share pump.fun link with community | ☐ |
