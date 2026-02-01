# $FSBD Token CA Setup Guide

## What You Need to Enter

### 1. Contract Address (CA) — Required

The **only required value** is your token's mint address (CA). You get this when you launch on pump.fun.

**Where to set it (pick one):**

| Option | Where | How |
|--------|-------|-----|
| **Vercel** | Settings → Environment Variables | `NEXT_PUBLIC_FSBD_TOKEN_MINT` = your mint address (e.g. `7xKXt...`) |
| **Admin Panel** | Admin → Platform Config | Set "$FSBD Token Mint" and save |

Redeploy after changing in Vercel.

---

### 2. What Happens When You Enter the CA

Once the CA is set, **everything updates automatically**:

| Feature | Behavior |
|---------|----------|
| **Hero links** | pump.fun, DexScreener, Birdeye, Jupiter, Raydium links auto-build from CA |
| **User tiers** | Each user's on-chain balance is checked. Tiers (Bronze/Silver/Gold) update based on holdings. |
| **Auction access** | Gold tier (10M+ tokens) can create auctions |
| **Listing fee discounts** | Token launch fees are discounted by tier |
| **Platform fee** | Lower fee rate for higher tiers |

**No cache or manual refresh** — tiers are read from the blockchain when the user loads their profile or hits tier-gated actions.

---

### 3. pump.fun — No Config Needed

Link is built automatically: `https://pump.fun/coin/[YOUR_CA]`

---

### 4. CoinGecko & CoinMarketCap

**Before listing (default):**
- CoinGecko → links to [request form](https://www.coingecko.com/request-form)
- CoinMarketCap → links to [request form](https://coinmarketcap.com/request/)

**After your token is listed**, add direct URLs in Vercel:

```
NEXT_PUBLIC_COINGECKO_URL=https://www.coingecko.com/en/coins/fsbd
NEXT_PUBLIC_COINMARKETCAP_URL=https://coinmarketcap.com/currencies/fsbd
```

(Replace `fsbd` with your actual slug from their site.)

---

## Checklist

- [ ] Launch token on pump.fun
- [ ] Copy the mint address (CA)
- [ ] Add to Vercel: `NEXT_PUBLIC_FSBD_TOKEN_MINT` **or** set in Admin → Platform Config
- [ ] Redeploy (if using Vercel)
- [ ] Submit to CoinGecko / CoinMarketCap request forms
- [ ] (Later) Add direct URLs when listed
