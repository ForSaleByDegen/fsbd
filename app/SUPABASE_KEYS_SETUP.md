# Supabase Keys Setup - Quick Reference

## Your Supabase Project Info

- **Project ID**: `zvbwvbdvbriabhktenas`
- **Project URL**: `https://zvbwvbdvbriabhktenas.supabase.co`

## Required Environment Variables for Vercel

### 1. Project URL
```
NEXT_PUBLIC_SUPABASE_URL=https://zvbwvbdvbriabhktenas.supabase.co
```

### 2. Legacy Anon Key (Required)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (get from Legacy tab)
```

**Where to find it:**
- Supabase Dashboard → API Keys
- Click tab: **"Legacy anon, service_role API keys"**
- Copy the `anon` key (starts with `eyJ...`)

### 3. Legacy Service Role Key (Optional - for admin)
```
SUPABASE_SERVICE_ROLE_KEY=eyJ... (get from Legacy tab)
```

**Where to find it:**
- Same "Legacy anon, service_role API keys" tab
- Copy the `service_role` key (starts with `eyJ...`)
- ⚠️ Keep this secret - never expose in client code

## Important Notes

- ❌ **Don't use** the new `sb_publishable_` keys - they won't work with current code
- ✅ **Use** the legacy `anon` key (JWT format starting with `eyJ...`)
- The new keys require different configuration and aren't compatible yet

## Quick Steps

1. Go to Supabase → API Keys → "Legacy anon, service_role API keys" tab
2. Copy `anon` key
3. Add to Vercel: `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
4. Add to Vercel: `NEXT_PUBLIC_SUPABASE_URL` = `https://zvbwvbdvbriabhktenas.supabase.co`
5. Redeploy Vercel project
6. Verify build logs don't show "Supabase credentials not set"
