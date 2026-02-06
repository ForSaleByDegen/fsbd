# Lister Rewards Airdrop

30% of $FSBD supply is reserved for rewards and listing incentives. This airdrop sends **4200.69 $FSBD** to each unique wallet that has created at least one listing on the platform.

## Prerequisites

1. **Run the migration** in Supabase SQL Editor:
   ```
   app/supabase/migration_lister_airdrop.sql
   ```

2. **Source wallet** with:
   - $FSBD tokens (at least `4200.69 × number_of_listers`)
   - SOL for transaction fees (~0.01 SOL per recipient)

3. **Env vars**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_FSBD_TOKEN_MINT` (or defaults to production pump.fun mint)
   - `NEXT_PUBLIC_RPC_URL` or `RPC_URL`
   - `AIRDROP_SOURCE_KEYPAIR` — path to JSON keypair file **or**
   - `AIRDROP_SOURCE_KEYPAIR_BASE64` — base64-encoded keypair

## Steps

### 1. Snapshot only (dry run)

Creates a snapshot of all unique listers and saves to DB. No tokens sent.

```bash
cd app
npx tsx scripts/lister-airdrop.ts --snapshot-only
```

Output: number of unique listers, snapshot ID.

### 2. Execute airdrop

Sends 4200.69 $FSBD to each recipient. Uses batches with delays to avoid RPC throttling.

**Option A:** Create snapshot and execute in one run:
```bash
cd app
npx tsx scripts/lister-airdrop.ts --execute
```

**Option B:** Use an existing snapshot (after `--snapshot-only`):
```bash
npx tsx scripts/lister-airdrop.ts --execute --snapshot-id=<SNAPSHOT_UUID>
```

The script will:
- Create a new snapshot (or use latest)
- For each recipient: create ATA if needed, transfer tokens
- Update `lister_airdrop_recipients` with status (sent/failed), tx signature

### 3. Check status

Query in Supabase:

```sql
SELECT snapshot_id, status, COUNT(*) 
FROM lister_airdrop_recipients 
GROUP BY snapshot_id, status;
```

## Security

- **AIRDROP_SOURCE_KEYPAIR** must be kept secret. Use a dedicated wallet for rewards.
- Run locally or in a secure CI; do not expose the keypair in Vercel or client.
- Verify the snapshot count before `--execute`.

## $FSBD decimals

Production $FSBD (pump.fun) uses 6 decimals. The script uses `AMOUNT_PER_WALLET = 4200.69` and converts to raw units: `4200.69 × 10^6`.
