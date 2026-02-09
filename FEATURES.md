# For Sale By Degen ($FBSD) - Feature Overview

## 🎯 What We've Built

A **privacy-first, anonymous decentralized marketplace** on Solana with the following features:

### ✅ Core Features Implemented

1. **Wallet Authentication**
   - Solana Wallet Adapter integration (Phantom, Solflare)
   - No emails, no passwords - wallet-only
   - Wallet addresses hashed before storage

2. **Listings System**
   - Create listings with title, description, price (SOL/USDC)
   - Category filtering (for-sale, services, gigs, housing, community, jobs)
   - Search functionality
   - IPFS image upload support
   - View individual listings
   - "My Listings" page

3. **$FBSD Tier System**
   - On-chain balance checking (no data sharing)
   - 4 tiers: Free, Bronze (1K tokens), Silver (10K tokens), Gold (100K tokens)
   - Automatic fee reduction based on tier
   - Tier display page with benefits

4. **AI Listing & Snap to Compare**
   - **AI Listing** vs **Manual Listing** mode on create: choose to have AI prefill or fill everything yourself.
   - **Snap to Compare**: take a photo or upload an image; AI (Gemini) analyzes the item, suggests title, description, price, category, subcategory, and search keywords; finds similar FSBD listings as comps; suggests token name/symbol/description for token launch.
   - **Apply all AI suggestions**: one click to fill the create form from AI output. Review and edit before submitting.
   - **Search keywords**: listings store `search_keywords` (array); AI suggests keywords; displayed as tag chips on listing detail.
   - **Daily limit**: 1 AI listing per user per day (per wallet) until in-house AI; usage tracker shows "1/1 used" and when it resets; Snap/camera disabled when limit used. Keyword search in Snap to Compare is always allowed and not counted.
   - Clean formatting: AI description text is stripped of markdown/code fences before display.

4. **Token Launching**
   - Optional SPL token creation for listings
   - Basic token minting (1B supply)
   - Fun/marketing only (disclaimers included)

5. **Payments**
   - SOL/USDC payment support
   - Basic escrow implementation (simplified)
   - Fee payment on listing creation
   - Tier-based fee discounts

6. **Privacy & Security**
   - No tracking or analytics
   - Wallet addresses hashed
   - Encrypted data storage
   - Input validation
   - Disclaimers on all pages
   - No external sharing features

### 🎨 UI/UX

- **shadcn/ui components**: Modern, minimalist design
- **Tailwind CSS**: Responsive, mobile-first
- **Dark mode support**: Built-in theme switching
- **Clean layout**: Craigslist-inspired simplicity

### 📁 Project Structure

```
app/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home feed
│   ├── listings/
│   │   ├── create/        # Create listing page
│   │   ├── [id]/          # Listing detail
│   │   └── my/            # User's listings
│   └── tiers/             # Tier information
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── Header.tsx         # Navigation
│   ├── CreateListingForm.tsx
│   ├── ListingFeed.tsx
│   ├── ListingCard.tsx
│   └── TierDisplay.tsx
├── lib/
│   ├── tier-check.ts      # $FBSD balance & tier logic ⭐
│   ├── supabase.ts        # Database client
│   ├── ipfs.ts            # IPFS upload
│   └── token-ops.ts        # Token creation
└── app/api/listings/      # API routes
```

### 🔧 Key Files

- **`lib/tier-check.ts`**: Core tier system logic with on-chain balance checks
- **`components/CreateListingForm.tsx`**: Full listing creation with IPFS, token launching, AI vs Manual mode, Snap to Compare
- **`components/SnapToCompare.tsx`**: Snap/upload image → AI analysis, comps, Apply all suggestions, daily usage tracker
- **`app/api/listings/find-comps-from-image/route.ts`**: AI image analysis (Gemini), daily limit check, comps from FSBD
- **`app/api/listings/ai-usage/route.ts`**: GET daily AI listing usage (usedToday, resetsAt)
- **`app/page.tsx`**: Home feed with search and filtering
- **`components/TierDisplay.tsx`**: Visual tier information

### 🚀 What's Running

- **Frontend**: Next.js 14 App Router on http://localhost:3000
- **Database**: Supabase (optional) or API routes fallback
- **Blockchain**: Solana Devnet (configurable)

### 📝 TODO / Placeholders

- [ ] Replace `FBSD_TOKEN_MINT_PLACEHOLDER` with actual token address after launch
- [ ] Implement proper escrow Solana program (currently simplified)
- [x] Add Solana Pay QR codes (listing detail: "Scan QR" next to wallet link)
- [ ] Optional: Pump.fun integration
- [ ] Build in-house AI for Snap to Compare to relax daily limit

### 🔒 Privacy Features

- ✅ No analytics
- ✅ No tracking cookies
- ✅ Wallet addresses hashed
- ✅ Encrypted storage
- ✅ No external sharing
- ✅ Anonymous by design

### ⚠️ Disclaimers

All pages include disclaimers:
- Experimental side project MVP
- Not financial advice
- $FBSD is utility token only
- Use at your own risk
- No guarantees or warranties

---

**Status**: Ready for testing on Solana Devnet! 🎉
