# Vercel Supabase Setup Guide

## Problem
Your build logs show: `Supabase credentials not set. Using local storage fallback.`

This means listings aren't being saved to the database - they're only stored in browser local storage, which doesn't persist across devices or sessions.

## Solution: Add Supabase Environment Variables to Vercel

### Step 1: Get Your Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

### Step 2: Add to Vercel

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your `fsbd` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

#### Required Variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- **Environment**: Production, Preview, Development (select all)

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Your Supabase anon/public key (starts with `eyJ...`)
- **Environment**: Production, Preview, Development (select all)

#### Optional (for Admin Features):

**Variable 3:**
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Your Supabase service role key (from Settings → API → service_role key)
- **Environment**: Production, Preview, Development (select all)
- ⚠️ **Warning**: This is a secret key - never expose it in client-side code

### Step 3: Run Database Schema

Before listings will work, you need to create the database tables:

1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the contents of `app/supabase/schema.sql`
3. Paste and run it in the SQL Editor
4. This creates the `listings`, `profiles`, and `admins` tables

### Step 4: Redeploy

After adding environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger auto-deploy

### Step 5: Verify

After redeploy, check the build logs. You should **NOT** see:
```
Supabase credentials not set. Using local storage fallback.
```

Instead, Supabase should connect successfully.

## Quick Checklist

- [ ] Supabase project created
- [ ] Database schema run (`schema.sql`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` added to Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added to Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to Vercel (optional, for admin)
- [ ] Vercel project redeployed
- [ ] Build logs show no "Supabase credentials not set" warning

## Troubleshooting

**Still seeing "Supabase credentials not set"?**
- Make sure variable names are EXACTLY: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables

**Listings still not saving?**
- Check browser console (F12) for errors
- Verify database schema was run successfully
- Check Supabase Dashboard → Table Editor to see if `listings` table exists

**Need help?**
- Check `app/supabase/README.md` for more details
- Check `app/ADMIN_SETUP.md` for admin setup
