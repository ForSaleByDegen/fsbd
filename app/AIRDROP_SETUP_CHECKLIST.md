# Lister Airdrop Setup Checklist

Use this checklist to run the 4200.69 $FSBD airdrop to all unique listers.

---

## Step 1: Run the migration in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Open **SQL Editor**
3. Copy the contents of `app/supabase/migration_lister_airdrop.sql`
4. Run the query

This creates `lister_airdrop_snapshots` and `lister_airdrop_recipients` tables.

---

## Step 2: Create the airdrop source wallet

You need a dedicated wallet that holds the 30% rewards supply and will send $FSBD.

**Option A: Use a new wallet (recommended)**

```bash
solana-keygen new -o airdrop-rewards.json
```

- Save the file securely
- Fund it with:
  - **$FSBD**: at least `4200.69 × (number of listers)` tokens
  - **SOL**: ~0.01 SOL per recipient for tx fees (e.g. 100 listers = ~1 SOL)

**Option B: Use an existing rewards wallet**

Export the keypair to a JSON file or base64 for the env var.

---

## Step 3: Transfer $FSBD into the airdrop wallet

1. Get the airdrop wallet address: `solana-keygen pubkey airdrop-rewards.json`
2. Send $FSBD from your treasury/30% allocation to that address
3. Verify balance in Phantom or Solscan

---

## Step 4: Set up environment variables

Create a `.env.local` in the `app` folder (or use your existing env) with:

```env
# Supabase (required for snapshot)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# RPC (mainnet for production)
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
# Or use Helius: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# $FSBD mint (production pump.fun)
NEXT_PUBLIC_FSBD_TOKEN_MINT=A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump

# Airdrop source - choose one:

# Option 1: Path to keypair file (relative to project root)
AIRDROP_SOURCE_KEYPAIR=./airdrop-rewards.json

# Option 2: Base64-encoded keypair (for CI/secure storage)
# AIRDROP_SOURCE_KEYPAIR_BASE64=<base64 of keypair array>
```

**Security:** Never commit `airdrop-rewards.json` or the base64 key to git. Add `airdrop-rewards.json` to `.gitignore`.

---

## Step 5: Dry run (snapshot only)

Verify the snapshot before sending any tokens:

```bash
cd app
npx tsx scripts/lister-airdrop.ts --snapshot-only
```

You should see:
- Number of unique listers
- Snapshot ID (UUID)

Check the data in Supabase:

```sql
SELECT * FROM lister_airdrop_snapshots ORDER BY snapshot_at DESC LIMIT 1;
SELECT COUNT(*) FROM lister_airdrop_recipients WHERE snapshot_id = '<YOUR_SNAPSHOT_ID>';
```

---

## Step 6: Execute the airdrop

**Option A: Create new snapshot and send**

```bash
cd app
npx tsx scripts/lister-airdrop.ts --execute
```

**Option B: Use existing snapshot (from Step 5)**

```bash
npx tsx scripts/lister-airdrop.ts --execute --snapshot-id=<SNAPSHOT_UUID>
```

The script will:
- Send 4200.69 $FSBD to each wallet
- Create ATAs where needed
- Update status (sent/failed) and tx signatures in the DB
- Pause between batches to avoid RPC throttling

---

## Step 7: Verify results

**In Supabase:**

```sql
SELECT status, COUNT(*) 
FROM lister_airdrop_recipients 
WHERE snapshot_id = '<YOUR_SNAPSHOT_ID>'
GROUP BY status;
```

**On-chain:** Check a few recipient wallets on Solscan to confirm $FSBD was received.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Snapshot not found" | Run `--snapshot-only` first, copy the UUID |
| "Insufficient funds" | Add more $FSBD or SOL to the airdrop wallet |
| "Account not found" | Ensure RPC is mainnet if using production $FSBD |
| Rate limit / timeout | Script has built-in delays; reduce `batchSize` in the script if needed |
| RLS / permission error | Use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS) |

---

## Optional: Add to .gitignore

```
airdrop-rewards.json
*.keypair
```
