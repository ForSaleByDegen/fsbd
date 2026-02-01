# Beta Mode & $FSBD Lock Setup

## Beta Landing & Platform Lockdown

When `NEXT_PUBLIC_BETA_MODE=true`:

1. **Home page** shows a beta landing with wallet connect + beta signup instead of the marketplace.
2. **Platform is fully locked**: All marketplace routes (`/listings`, `/profile`, `/seller`, `/tiers`, `/report`) redirect to the home page.
3. **Header** hides Browse, Activity, Create, Auction, My Listings, Profile, Tiers. Why $FSBD, Terms, Privacy, and Admin (if applicable) remain.
4. **Listing creation API** rejects POST requests with 403.
5. Users hitting locked routes see a banner on the beta landing explaining the lockdown.

Use this until the $FSBD token is live and tier-based access is ready.

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

When ready to go live (token launched, tiers enforced):
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
