# Pinata IPFS Setup Guide

## Why Pinata?

Pinata is more reliable than NFT.Storage for production use:
- Better uptime and performance
- Free tier: 1GB storage, 100 files/month
- Faster uploads
- Better gateway performance

## Setup Steps

### 1. Create Pinata Account

1. Go to https://app.pinata.cloud
2. Sign up for a free account
3. Verify your email

### 2. Get Your JWT Token

1. Go to https://app.pinata.cloud/developers/api-keys
2. Click "New Key"
3. Name it (e.g., "FSBD App")
4. Give it permissions:
   - ✅ `pinFileToIPFS` (required)
   - ✅ `pinJSONToIPFS` (optional, for metadata)
5. Copy the **JWT Token** (starts with `eyJ...`)

### 3. Add to Vercel Environment Variables

1. Go to your Vercel project → Settings → Environment Variables
2. Add:
   - **Key**: `NEXT_PUBLIC_PINATA_JWT`
   - **Value**: Your JWT token (the `eyJ...` string)
   - **Environment**: Production, Preview, Development (all)
3. Click "Save"

### 4. Optional: Custom Gateway

If you have a Pinata dedicated gateway:
- **Key**: `NEXT_PUBLIC_PINATA_GATEWAY`
- **Value**: `your-gateway.mypinata.cloud`
- Defaults to `gateway.pinata.cloud` if not set

### 5. Redeploy

After adding environment variables, redeploy your app in Vercel.

## Testing

1. Create a listing with an image
2. The image should upload to Pinata
3. Check your Pinata dashboard → Files to see uploaded files
4. Images will be accessible via Pinata gateway

## Troubleshooting

- **"Pinata JWT not configured"**: Make sure `NEXT_PUBLIC_PINATA_JWT` is set in Vercel
- **"Invalid or expired JWT"**: Regenerate your API key in Pinata dashboard
- **Rate limit errors**: Free tier allows 100 files/month - upgrade if needed
- **Upload fails**: Check browser console for detailed error messages

## Free Tier Limits

- **Storage**: 1GB total
- **Files**: 100 files/month
- **Bandwidth**: 50GB/month

For production, consider upgrading to a paid plan.
