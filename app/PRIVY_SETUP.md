# Privy Setup Guide

Privy allows users to connect with email, social accounts (Google, Twitter, Discord), or traditional wallets. It also creates embedded wallets for users who don't have one.

## Step 1: Create Privy Account

1. Go to https://privy.io
2. Sign up for a free account
3. Create a new app

## Step 2: Get Your App ID

1. In Privy dashboard, go to your app
2. Copy your **App ID** (looks like: `clxxxxxxxxxxxxxxxxxx`)
3. Add it to your `.env` file:

```env
NEXT_PUBLIC_PRIVY_APP_ID=clxxxxxxxxxxxxxxxxxx
```

## Step 3: Configure Privy App Settings

In the Privy dashboard:

1. **Login Methods**: Enable:
   - Email
   - Wallet (Phantom, Solflare, etc.)
   - Google
   - Twitter
   - Discord

2. **Embedded Wallets**: 
   - Enable "Create on login" → Set to "Users without wallets"
   - This creates a wallet automatically for email/social logins

3. **Solana Configuration**:
   - Add Solana Devnet chain
   - RPC URL: `https://api.devnet.solana.com` (or your custom RPC)

## Step 4: Add to Vercel Environment Variables

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_PRIVY_APP_ID`
   - Value: Your Privy App ID
3. Redeploy

## How It Works

- **Email/Social Login**: Users can sign in with email, Google, Twitter, or Discord. Privy automatically creates an embedded Solana wallet for them.
- **Wallet Login**: Users can still connect with Phantom, Solflare, etc. (works alongside Privy)
- **Profile Page**: Shows wallet address, email, linked accounts, and tier status
- **Fallback**: If Privy App ID is not set, the app falls back to Solana wallet adapter only

## Features Enabled

✅ Email login  
✅ Social login (Google, Twitter, Discord)  
✅ Traditional wallet connection (Phantom, Solflare)  
✅ Automatic wallet creation for email/social users  
✅ Profile page with user info  
✅ Solana Devnet support  

## Testing

1. Set `NEXT_PUBLIC_PRIVY_APP_ID` in your `.env`
2. Run `npm run dev`
3. Click "Connect" button
4. Try logging in with email or social account
5. Check `/profile` page to see your account info

## Notes

- Privy is optional - if App ID is not set, the app works with Solana wallet adapter only
- Embedded wallets are created automatically for email/social users
- All wallet addresses work with the existing Solana functionality
- Profile page shows both Privy and Solana wallet info
