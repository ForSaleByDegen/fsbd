# Domain Setup Guide - fsbd.fun

## Step 1: Configure Domain in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (`fsbd` or `ForSaleByDegen/fsbd`)
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `fsbd.fun`
6. Click **Add**

## Step 2: Configure DNS Records

Vercel will provide you with DNS records to add. Typically:

### Option A: A Record (Recommended)
```
Type: A
Name: @
Value: 76.76.21.21 (Vercel's IP - check Vercel dashboard for current IP)
TTL: 3600
```

### Option B: CNAME Record
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600
```

### For www subdomain (optional):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

## Step 3: Add DNS Records to Your Domain Provider

1. Log into your domain registrar (where you bought fsbd.fun)
2. Go to DNS Management / DNS Settings
3. Add the records provided by Vercel
4. Save changes

## Step 4: Wait for Propagation

- DNS changes can take 24-48 hours to propagate
- Usually works within a few minutes to a few hours
- Check status in Vercel dashboard (should show "Valid Configuration" when ready)

## Step 5: Verify SSL Certificate

- Vercel automatically provisions SSL certificates via Let's Encrypt
- Once DNS propagates, SSL will be active automatically
- Your site will be accessible at `https://fsbd.fun`

## Step 6: Update Environment Variables (if needed)

If you have any hardcoded URLs in your app, update them:
- Check for any `fbsd.app.vercel.app` references
- Update to use `fsbd.fun` or relative paths

## Troubleshooting

### Domain not resolving?
- Check DNS records are correct
- Wait for propagation (can take up to 48 hours)
- Use `dig fsbd.fun` or `nslookup fsbd.fun` to check DNS

### SSL certificate issues?
- Vercel handles SSL automatically
- Make sure DNS is properly configured first
- Check Vercel dashboard for SSL status

### Still seeing old domain?
- Clear browser cache
- Try incognito/private mode
- Check Vercel deployment is using the custom domain

## Quick Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records added to domain registrar
- [ ] DNS records match Vercel's requirements
- [ ] Waited for DNS propagation
- [ ] SSL certificate active (check Vercel dashboard)
- [ ] Site accessible at https://fsbd.fun
- [ ] Updated any hardcoded URLs in code

Your site will be live at **https://fsbd.fun** once DNS propagates! 🎉
