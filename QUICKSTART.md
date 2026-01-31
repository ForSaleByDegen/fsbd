# Quick Start Guide

Get the Solana Marketplace running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Phantom wallet installed

## Step 1: Install Dependencies

```bash
npm run install:all
```

## Step 2: Setup Environment

Copy the example env files:

```bash
cp app/.env.example app/.env
cp backend/.env.example backend/.env
```

Edit `app/.env` and `backend/.env` with your configuration.

## Step 3: Start MongoDB

**Local MongoDB:**
```bash
# macOS/Linux
mongod

# Windows
# Start MongoDB service or run mongod.exe
```

**MongoDB Atlas:**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Copy the connection string to `backend/.env` as `MONGODB_URI`

## Step 4: Deploy $APPTOKEN (Optional for Testing)

For full functionality, deploy the app token:

```bash
cd scripts
npm install
ts-node deployToken.ts
```

Copy the mint address from `token-deployment.json` to your `.env` files.

## Step 5: Run the App

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Step 6: Connect Wallet

1. Open http://localhost:3000
2. Click "Select Wallet" in the header
3. Connect with Phantom
4. Switch to Devnet in Phantom settings (for testing)

## Step 7: Create Your First Listing

1. Click "+ Create Listing"
2. Fill in the form
3. Sign the transaction to pay the fee
4. Your listing is live!

## Testing Tips

- Use Solana Devnet for testing (free SOL available)
- Get devnet SOL: https://faucet.solana.com
- Test with small amounts first
- Check transactions on Solana Explorer

## Troubleshooting

**Wallet won't connect:**
- Make sure Phantom is installed and unlocked
- Check you're on the correct network (devnet/mainnet)

**Backend won't start:**
- Verify MongoDB is running
- Check MONGODB_URI in `.env`

**Token operations fail:**
- Ensure you have SOL in your wallet
- Verify RPC endpoint is accessible
- Check network matches your wallet

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Review [SECURITY.md](SECURITY.md) for security best practices
- Check [CONTRIBUTING.md](CONTRIBUTING.md) if you want to contribute

Happy building! 🚀
