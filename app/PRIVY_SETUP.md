# Privy Setup Guide

Privy allows users to connect with email, social logins, or existing wallets. When users sign in with email/social, Privy automatically creates an embedded Solana wallet for them.

## Setup Steps

### 1. Create Privy Account

1. Go to https://dashboard.privy.io
2. Sign up for a free account
3. Create a new app
4. Copy your **App ID**

### 2. Configure Environment Variable

Add to your `.env` file (or Vercel environment variables):

```env
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
```

### 3. Enable Solana in Privy Dashboard

1. Go to your Privy app settings
2. Navigate to **Chains** → **Solana**
3. Enable Solana Devnet (or Mainnet for production)
4. Configure RPC endpoint if needed

### 4. Configure Login Methods

In Privy Dashboard → **Login Methods**:
- ✅ Email
- ✅ Google
- ✅ Twitter/X
- ✅ Discord
- ✅ GitHub
- ✅ Wallet (for existing Solana wallets)

### 5. Enable Embedded Wallets

In Privy Dashboard → **Wallets** → **Embedded Wallets**:
- Enable "Create embedded wallet on login"
- Set to "Users without wallets" (creates wallet automatically for email/social logins)

## How It Works

### For New Users (Email/Social):
1. User clicks "Connect"
2. Chooses email, Google, Twitter, etc.
3. Privy creates embedded Solana wallet automatically
4. User can immediately use the app

### For Existing Wallet Users:
1. User clicks "Connect"
2. Chooses "Wallet" option
3. Connects Phantom, Solflare, etc.
4. Uses their existing wallet

### Fallback:
- If Privy is not configured (`NEXT_PUBLIC_PRIVY_APP_ID` not set), the app falls back to regular Solana Wallet Adapter
- Users can still connect with Phantom/Solflare directly

## Testing

1. Set `NEXT_PUBLIC_PRIVY_APP_ID` in your `.env`
2. Run `npm run dev`
3. Click "Connect" → Should see Privy modal with login options
4. Try email login → Should create embedded wallet automatically
5. Check profile page → Should show wallet address and email

## Production Checklist

- [ ] Set `NEXT_PUBLIC_PRIVY_APP_ID` in Vercel environment variables
- [ ] Enable Solana Mainnet in Privy dashboard (if using mainnet)
- [ ] Configure custom domain in Privy (optional)
- [ ] Test email/social login flows
- [ ] Test embedded wallet creation
- [ ] Verify profile page shows correct wallet address

## Notes

- Privy works alongside Solana Wallet Adapter
- If Privy is not configured, app works normally with wallet adapter
- Embedded wallets are fully functional Solana wallets
- Users can export their embedded wallet keys if needed
- All wallet operations work the same regardless of login method
