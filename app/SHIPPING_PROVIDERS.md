# Shipping Label Providers Comparison

## Quick Recommendation: **Shippo** 🏆

**Why Shippo?**
- ✅ Easier signup process (no issues like EasyPost)
- ✅ Developer-friendly API
- ✅ Pay-as-you-go: $0.05 per label (no monthly fee)
- ✅ Supports 1000+ carriers
- ✅ Excellent documentation
- ✅ Test mode available

## Provider Comparison

### 1. Shippo (Recommended)

**Pricing:**
- Pay-as-you-go: $0.05 per label
- Professional: $10/month + per-label fees
- No credit card required for test mode

**Signup:**
1. Go to https://goshippo.com/
2. Click "Sign Up Free"
3. Create account (usually works smoothly)
4. Get API key from Settings → API Keys

**Setup:**
```bash
# Add to Vercel environment variables:
NEXT_PUBLIC_SHIPPING_PROVIDER=shippo
NEXT_PUBLIC_SHIPPO_API_KEY=your_shippo_api_key_here
```

**Pros:**
- Easy signup
- Simple API
- Good documentation
- Test mode available
- No monthly fee for basic use

**Cons:**
- Slightly more expensive per label than EasyPost
- Less carrier options than ShipStation

---

### 2. EasyPost

**Pricing:**
- Similar to Shippo
- $100 credit for new users

**Signup:**
- https://www.easypost.com/
- Sometimes has signup issues (as you experienced)

**Setup:**
```bash
NEXT_PUBLIC_SHIPPING_PROVIDER=easypost
NEXT_PUBLIC_EASYPOST_API_KEY=your_easypost_api_key_here
```

**Pros:**
- Good API
- $100 credit for new users
- Well-established

**Cons:**
- Signup can be problematic
- Support response can be slow

---

### 3. ShipStation

**Pricing:**
- $9.99/month minimum
- More expensive for low volume

**Pros:**
- Industry standard
- Great marketplace integrations
- Robust features

**Cons:**
- Monthly fee required
- Steeper learning curve
- More complex API

**Best for:** High-volume sellers, multi-channel operations

---

### 4. Pirate Ship

**Pricing:**
- Completely FREE
- USPS and UPS discounts (up to 89%)

**Pros:**
- Free!
- Great discounts
- No API fees

**Cons:**
- Limited carrier options (USPS, UPS only)
- No official API (would need web scraping - not recommended)

**Best for:** US-only sellers, low-tech operations

---

## Recommended Setup: Shippo

### Step 1: Sign Up
1. Go to https://apps.goshippo.com/join (correct signup URL)
2. Create account (should work smoothly)
3. Verify email

### Step 2: Get API Key
1. Log in to Shippo dashboard
2. Go to Settings → API Keys
3. Copy your **Test Key** (starts with `shippo_test_`)
4. Use test key for development

### Step 3: Add to Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SHIPPING_PROVIDER` = `shippo`
   - `NEXT_PUBLIC_SHIPPO_API_KEY` = `your_test_key_here`
3. Redeploy

### Step 4: Test
1. Create a listing
2. Purchase it
3. Mark as shipped
4. Create shipping label (should work!)

## Code Already Supports Both!

The code automatically detects which provider to use based on `NEXT_PUBLIC_SHIPPING_PROVIDER`:

- `shippo` → Uses Shippo API
- `easypost` → Uses EasyPost API (default)

No code changes needed - just set the environment variable!

## Test Mode

Both providers offer test mode:
- **Shippo**: Test keys start with `shippo_test_`
- **EasyPost**: Test keys start with `test_`

Test labels are generated but not real - perfect for development!

---

## Quick Start with Shippo

1. **Sign up**: https://apps.goshippo.com/join (correct URL!)
2. **Get test API key**: Dashboard → Settings → API Keys
3. **Add to Vercel**:
   ```
   NEXT_PUBLIC_SHIPPING_PROVIDER=shippo
   NEXT_PUBLIC_SHIPPO_API_KEY=shippo_test_your_key_here
   ```
4. **Redeploy and test!**

That's it! Shippo should work much better than EasyPost for signup.
