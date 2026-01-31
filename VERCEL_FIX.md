# Fix Vercel Build Error

## Problem
Build is failing because React version isn't matching Next.js requirements.

## Solution

The issue is that Vercel needs to install dependencies in the `app` folder, not the root.

### Option 1: Update Vercel Settings (Recommended)

In Vercel Dashboard → Your Project → Settings → General:

1. **Root Directory**: Make sure it's set to `app` ✅
2. **Build Command**: Should be `npm run build` (runs in app folder)
3. **Install Command**: Should be `npm install` (runs in app folder)
4. **Output Directory**: `.next`

### Option 2: Fix package.json

I've updated `app/package.json` to ensure React versions are correct. Push the fix:

```bash
cd c:\Users\dusti\OneDrive\Desktop\FSBD
git add app/package.json
git commit -m "Fix React version for Next.js compatibility"
git push
```

Vercel will automatically rebuild.

### Option 3: Add .vercelignore

Create `app/.vercelignore` to ensure root files aren't interfering:

```
../package.json
../package-lock.json
../node_modules
```

---

## After Fix

1. Push the updated `package.json`
2. Vercel will auto-rebuild
3. Check build logs to confirm it's working
