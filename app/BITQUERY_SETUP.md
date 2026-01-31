# Bitquery Balance Verification (Optional Fallback)

When Solana RPC reports 0 SOL incorrectly (common with public RPC or Phantom on mobile), we use **Bitquery** as a balance verification fallback.

> **Important:** Bitquery is **read-only**. It cannot send transactions. Actual purchases still require a working Solana RPC (Helius, QuickNode, etc.). Bitquery only helps verify balance when RPC is wrong.

## Setup

1. **Create account** at [account.bitquery.io](https://account.bitquery.io)
2. **Generate API key** from [Access Token page](https://account.bitquery.io/user/api_v2/access_tokens)
3. **Add to Vercel** env vars: `BITQUERY_API_KEY` = your token

## What It Does

- When RPC reports 0 SOL, the app calls `/api/balance/verify?wallet=XXX`
- If Bitquery confirms you have SOL, shows: "Bitquery confirms you have X.XX SOL. Proceed with purchase?"
- User can proceed with more confidence

## Related Bitquery APIs (for future use)

- [Simple SOL transfers](https://ide.bitquery.io/Simple-SOL-transfers-Transactions-not-trades) – transaction history
- [Solana balance update](https://ide.bitquery.io/solana-balance-update) – real-time balance
- [Real-time USD price](https://ide.bitquery.io/Real-Time-usd-price-on-solana-chain) – SOL price in USD

## Primary Fix: skipPreflight Retry

The main fix for "AccountNotFound" / simulation failures is **retry with skipPreflight**. When RPC simulation fails, the app now offers: "Send transaction anyway? This skips simulation and submits directly to the network." This often works when Phantom + RPC have compatibility issues.
