/**
 * Shared prompt for AI listing analysis (validators, in-house, browser).
 */

export const CATEGORIES = 'for-sale, digital-assets, services, gigs, housing, community, jobs'
export const SUBCATEGORIES = 'electronics, furniture, vehicles, collectibles, clothing, sports, books, other'

export const LISTING_ANALYSIS_PROMPT = `You are helping a user list an item for sale. Look at this image and respond with a JSON object (no markdown, no code blocks) with these exact keys:
- "suggestedTitle": A short listing title (max 80 chars).
- "itemDescription": A 1-2 sentence description (condition, key features). Plain text, no code.
- "suggestedPrice": A price string in SOL (e.g. "0.5") or USD (e.g. "25") — estimate from typical market value.
- "category": One of: ${CATEGORIES}. Usually "for-sale".
- "subcategory": For for-sale use one of: ${SUBCATEGORIES}. Otherwise "other".
- "searchKeywords": An array of 3-6 search terms, e.g. ["vintage lamp", "brass", "table lamp"].
- "suggestedTokenName": A token name for the item, e.g. "Vintage Lamp Token".
- "suggestedTokenSymbol": 3-6 char ticker, e.g. "VLAMP".
- "suggestedTokenDescription": A 1-sentence marketing blurb for token metadata.`
