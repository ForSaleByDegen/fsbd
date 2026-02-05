/**
 * Affiliate link wrapper for external marketplace URLs.
 * Appends affiliate parameters when redirecting to Amazon, eBay, Etsy.
 * Set env vars: NEXT_PUBLIC_AMAZON_AFFILIATE_TAG, NEXT_PUBLIC_EBAY_CAMPAIGN_ID, NEXT_PUBLIC_ETSY_AFFILIATE_ID
 */

function getAmazonTag(): string | null {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG) || null
}

function getEbayCampaignId(): string | null {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_EBAY_CAMPAIGN_ID) || null
}

function getEtsyAffiliateId(): string | null {
  return (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ETSY_AFFILIATE_ID) || null
}

/**
 * Append affiliate parameters to a URL if we have config for that platform.
 * Returns the original URL unchanged if no affiliate config or URL is not supported.
 */
export function wrapWithAffiliate(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()

    // Amazon (amazon.com, amazon.co.uk, etc.)
    if (/amazon\.(com|co\.uk|de|fr|es|it|ca|co\.jp|in|com\.mx|com\.br)/i.test(host)) {
      const tag = getAmazonTag()
      if (tag) {
        parsed.searchParams.set('tag', tag)
        return parsed.toString()
      }
    }

    // eBay
    if (/ebay\.(com|co\.uk|de|fr|it|es|com\.au)/i.test(host) || host === 'www.ebay.com') {
      const campid = getEbayCampaignId()
      if (campid) {
        parsed.searchParams.set('mkevt', '1')
        parsed.searchParams.set('mkcid', '1')
        parsed.searchParams.set('campid', campid)
        return parsed.toString()
      }
    }

    // Etsy
    if (/etsy\.com/i.test(host)) {
      const ref = getEtsyAffiliateId()
      if (ref) {
        parsed.searchParams.set('ref', ref)
        return parsed.toString()
      }
    }

    return url
  } catch {
    return url
  }
}

/** Whether we have any affiliate config (for showing disclosure) */
export function hasAffiliateConfig(): boolean {
  return !!(getAmazonTag() || getEbayCampaignId() || getEtsyAffiliateId())
}
