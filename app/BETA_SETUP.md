# Beta Mode & $FSBD Lock Setup

## Beta Landing Page

When `NEXT_PUBLIC_BETA_MODE=true`, the home page shows a landing with wallet connect + beta signup instead of the marketplace.

### Setup

1. Add to `.env` or Vercel:
   ```
   NEXT_PUBLIC_BETA_MODE=true
   ```

2. Run the migration in Supabase SQL Editor:
   ```
   app/supabase/migration_fsbd_lock_and_beta.sql
   ```

3. Signups are stored in `beta_signups`. Export via Supabase dashboard or service role.

### Turn Off Beta Mode

When ready to go live:
```
NEXT_PUBLIC_BETA_MODE=false
```
(or remove the env var)

---

## Lock $FSBD Token Mint

Tiers are based on $FSBD holdings. Lock the mint after launch:

1. **Env**: Set `NEXT_PUBLIC_FSBD_TOKEN_MINT=<your_mint_address>`

2. **Admin Panel**: Go to Admin → Platform Config → set **$FSBD Token Mint** to your mint address. This overrides env and lets you change it without redeploying.

3. Both server (auction gate, listings API) and client (TierDisplay, AuctionForm) use the locked mint for balance checks.
