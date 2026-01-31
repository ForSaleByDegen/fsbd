# EasyPost Setup Guide

## Signup Issues

If you're seeing "Something went wrong" on EasyPost signup:

### Troubleshooting Steps

1. **Try Different Browser**
   - Clear cookies/cache
   - Try incognito/private mode
   - Use a different browser

2. **Check Email Domain**
   - Proton.me emails sometimes have issues
   - Try with Gmail or another provider
   - Or contact EasyPost support directly

3. **Contact EasyPost Support**
   - Email: support@easypost.com
   - They can help with signup issues
   - May be able to create account manually

4. **Try Test Mode First**
   - EasyPost offers test API keys
   - No credit card required for test mode
   - Good for development/testing

## Getting Your API Key

### After Successful Signup:

1. **Log in to EasyPost Dashboard**
   - Go to https://www.easypost.com/
   - Log in with your credentials

2. **Navigate to API Keys**
   - Go to Settings → API Keys
   - Or directly: https://www.easypost.com/settings/api-keys

3. **Copy Your API Key**
   - **Test Key**: Use for development (starts with `test_`)
   - **Production Key**: Use for live (starts with `prod_`)
   - Start with test key for now

4. **Add to Vercel**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_EASYPOST_API_KEY`
   - Value: Your test API key (e.g., `test_...`)
   - Redeploy

## Alternative Shipping Providers

If EasyPost continues to have issues, consider:

### 1. Shippo
- Similar API to EasyPost
- Good documentation
- Free tier available
- Signup: https://goshippo.com/

### 2. ShipStation
- More enterprise-focused
- Good for high volume
- API available

### 3. USPS/FedEx/UPS Direct APIs
- Direct integration
- More complex setup
- Better rates but more work

## Testing Without API Key

For now, you can test the escrow system without shipping labels:

1. **Skip shipping label creation** - The system will work without it
2. **Manual tracking** - Sellers can enter tracking numbers manually
3. **Add API key later** - Once EasyPost account is set up

The escrow flow (purchase → ship → receive) will work without shipping labels. Labels are just a convenience feature.

## Quick Test Mode Setup

If you want to test shipping labels immediately:

1. **Contact EasyPost Support**
   - Email: support@easypost.com
   - Explain you're building a marketplace
   - Ask for test API key or help with signup

2. **Use Test Mode**
   - Test keys don't require payment
   - Labels are generated but not real
   - Perfect for development

## Current Status

✅ **Escrow System**: Ready to test (works without shipping labels)
⏳ **Shipping Labels**: Waiting for EasyPost API key
✅ **Email Signup**: Ready
✅ **User PDA Wallets**: Ready
✅ **Withdrawal Restrictions**: Ready

You can proceed with testing the escrow system while sorting out EasyPost!
