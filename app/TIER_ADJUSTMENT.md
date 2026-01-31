# Tier Threshold Adjustment Guide

## Overview

Tier thresholds are **configurable** and can be adjusted as the $FSBD market cap grows. This allows you to lower thresholds over time to give more users access to tiered benefits and platform fee discounts.

## Current Thresholds

- **Bronze**: 100,000+ $FSBD tokens
- **Silver**: 1,000,000+ $FSBD tokens  
- **Gold**: 10,000,000+ $FSBD tokens

## How to Adjust

### Option 1: Environment Variables (Recommended)

Add to Vercel Environment Variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_TIER_BRONZE`
- **Value**: `100000` (or your desired threshold)
- **Environments**: Production, Preview, Development

**Variable 2:**
- **Key**: `NEXT_PUBLIC_TIER_SILVER`
- **Value**: `1000000` (or your desired threshold)
- **Environments**: Production, Preview, Development

**Variable 3:**
- **Key**: `NEXT_PUBLIC_TIER_GOLD`
- **Value**: `10000000` (or your desired threshold)
- **Environments**: Production, Preview, Development

3. Redeploy your project

### Option 2: Code Update

Edit `app/lib/tier-check.ts` and update the default values:

```typescript
const BRONZE_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_TIER_BRONZE || '100000')
const SILVER_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_TIER_SILVER || '1000000')
const GOLD_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_TIER_GOLD || '10000000')
```

## When to Adjust

Consider lowering thresholds when:
- Token price increases significantly (market cap growth)
- You want to reward more holders with discounts
- Community requests more accessible tiers
- Token distribution becomes more widespread

## Example Adjustments

**Scenario 1: Token 10x in price**
- Old: Bronze 100k → New: Bronze 10k
- Old: Silver 1M → New: Silver 100k
- Old: Gold 10M → New: Gold 1M

**Scenario 2: Gradual expansion**
- Lower thresholds by 50% every 6 months
- Or adjust based on percentage of holders in each tier

## Important Notes

- **Listings are always FREE** - no charge unless creating token/NFT
- Platform fees are tiered based on seller's tier
- Token launch fees are tiered (only charged if launching token)
- Thresholds affect platform fee discounts on sales

## Monitoring

Check admin analytics to see:
- How many users are in each tier
- Platform fee collection by tier
- Distribution of tier holders

Adjust thresholds to maintain healthy distribution across tiers.
