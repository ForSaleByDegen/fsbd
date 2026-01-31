# Starting the Dev Server

## Quick Start

If the server isn't running, follow these steps:

### 1. Install Dependencies (if not done)
```bash
cd app
npm install
```

This may take 2-5 minutes depending on your connection.

### 2. Start the Dev Server
```bash
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### 3. Open in Browser
Navigate to: http://localhost:3000

## Troubleshooting

### Port 3000 Already in Use
If you get an error about port 3000 being in use:
```bash
# Kill the process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- -p 3001
```

### Dependencies Not Installing
If npm install fails:
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### TypeScript Errors
If you see TypeScript errors, they're likely just warnings. The app should still run.

## What to Expect

Once running, you should see:
- **Home page** with "$FBSD" header
- **Wallet connect button** in the header
- **Disclaimer banner** (yellow)
- **Empty listings feed** (until you create listings)

## Next Steps After Server Starts

1. Connect your Solana wallet (Phantom/Solflare)
2. Switch wallet to **Devnet** for testing
3. Get devnet SOL: https://faucet.solana.com
4. Create your first listing!
