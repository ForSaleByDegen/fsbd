# Vercel Environment Variables Setup

## Your Supabase Credentials

**Project URL:**
```
https://zvbwvbdvbriabhktenas.supabase.co
```

**Legacy Anon Key (Public - Safe for Client):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Ynd2YmR2YnJpYWJoa3RlbmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjMzNjEsImV4cCI6MjA4NTM5OTM2MX0.DM5I5X39R5_PZJed25c38a-y049vCH4if2BAAt1b17M
```

**Legacy Service Role Key (Secret - Backend Only):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Ynd2YmR2YnJpYWJoa3RlbmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyMzM2MSwiZXhwIjoyMDg1Mzk5MzYxfQ.Q3atbxYf7o2YY1YdiYo9nWw9h1sA0wWzSdPmSrDv6mk
```

## Steps to Add to Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your `fsbd` project

2. **Navigate to Environment Variables:**
   - Settings → Environment Variables

3. **Add These 3 Variables:**

   **Variable 1:**
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://zvbwvbdvbriabhktenas.supabase.co`
   - **Environments:** ☑ Production ☑ Preview ☑ Development

   **Variable 2:**
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Ynd2YmR2YnJpYWJoa3RlbmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MjMzNjEsImV4cCI6MjA4NTM5OTM2MX0.DM5I5X39R5_PZJed25c38a-y049vCH4if2BAAt1b17M`
   - **Environments:** ☑ Production ☑ Preview ☑ Development

   **Variable 3:**
   - **Key:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2Ynd2YmR2YnJpYWJoa3RlbmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyMzM2MSwiZXhwIjoyMDg1Mzk5MzYxfQ.Q3atbxYf7o2YY1YdiYo9nWw9h1sA0wWzSdPmSrDv6mk`
   - **Environments:** ☑ Production ☑ Preview ☑ Development
   - ⚠️ **Keep this secret** - Never expose in client-side code

4. **Save and Redeploy:**
   - Click "Save" after adding each variable
   - Go to Deployments tab
   - Click "..." on latest deployment → "Redeploy"
   - Or push a new commit to trigger auto-deploy

## Verify It Works

After redeploy, check the build logs. You should **NOT** see:
```
Supabase credentials not set. Using local storage fallback.
```

Instead, Supabase should connect successfully and listings will save to the database!

## Additional Environment Variables Needed

You may also want to add:

- `NEXT_PUBLIC_PINATA_JWT` - Your Pinata JWT for IPFS uploads
- `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy App ID (if using Privy)
- `NEXT_PUBLIC_ENCRYPTION_KEY` - A 32-character encryption key (optional)
- `BITQUERY_API_KEY` - Bitquery API key (optional fallback for $FSBD balance when RPC fails) - see BITQUERY_SETUP.md

## Security Notes

- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (public key)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` is safe to expose (public URL)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is SECRET - never commit to git or expose in client code
- ⚠️ Never share your service_role key publicly
