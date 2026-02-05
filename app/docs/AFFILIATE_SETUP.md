# Affiliate Link Setup

External marketplace links (Amazon, eBay, Etsy) on listing pages are wrapped with affiliate parameters when configured.

## Environment Variables

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Platform | Example | Where to get it |
|----------|----------|---------|-----------------|
| `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | Amazon Associates | `fsbd-20` | [affiliate-program.amazon.com](https://affiliate-program.amazon.com/) |
| `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` | eBay Partner Network | `1234567890` | [partnernetwork.ebay.com](https://partnernetwork.ebay.com/) |
| `NEXT_PUBLIC_ETSY_AFFILIATE_ID` | Etsy Affiliate (Impact) | Your Impact ID | [partners.etsy.com](https://partners.etsy.com/) |

If a variable is not set, links to that platform are shown without affiliate parameters.

## Disclosure

When any affiliate config is present, the listing page shows:

> We may earn from qualifying purchases through affiliate links.

This satisfies typical affiliate program disclosure requirements.
