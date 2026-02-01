# Bug Report Setup

Users can submit bug reports (screenshots, error messages, failed tx) from `/report`. Reports are stored in Supabase and emailed to forsalebydegen.proton.me.

## 1. Run the migration

In Supabase SQL Editor, run `supabase/migration_bug_reports.sql`.

## 2. Resend (email)

1. Sign up at https://resend.com
2. Create an API key at https://resend.com/api-keys
3. Add to Vercel: `RESEND_API_KEY=re_...`

Free tier: 100 emails/day. Emails are sent from `onboarding@resend.dev` (Resend default). For production, verify your domain in Resend and update the `from` address in `app/api/bug-report/route.ts`.

## 3. Screenshots

Screenshots are uploaded to IPFS via Pinata (same as listing images). Ensure `NEXT_PUBLIC_PINATA_JWT` is set.

## Flow

1. User visits `/report` (linked in footer)
2. Fills description, optional error message, tx signature, screenshots
3. Client uploads screenshots to Pinata, sends report to API
4. API inserts into `bug_reports`, sends email to forsalebydegen.proton.me
