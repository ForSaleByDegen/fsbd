/**
 * Validates AI validator responses before they are used for listing suggestions.
 * Ensures users receive safe, well-formed data and validators cannot submit malformed or harmful content.
 */

const CATEGORIES = ['for-sale', 'digital-assets', 'services', 'gigs', 'housing', 'community', 'jobs']
const SUBCATEGORIES_FOR_SALE = ['electronics', 'furniture', 'vehicles', 'collectibles', 'clothing', 'sports', 'books', 'other']

/** Max lengths for fields (prevents DoS / overflow) */
const LIMITS = {
  suggestedTitle: 200,
  itemDescription: 2000,
  suggestedPrice: 50,
  suggestedTokenName: 100,
  suggestedTokenSymbol: 10,
  suggestedTokenDescription: 500,
  searchKeywords: 10,
  keywordLength: 80,
}

/** Block suspicious patterns (XSS, script injection, etc.) */
const BLOCKED_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+=["'][^"']*["']/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data:\s*text\//i,
  /data:\s*application\/(javascript|ecmascript)/i,
  /vbscript:/i,
]

function containsBlockedContent(text: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(text))
}

export type ParsedValidatorResponse = {
  itemDescription?: string
  category?: string
  subcategory?: string
  searchKeywords?: unknown
  suggestedTitle?: string
  suggestedPrice?: string
  price?: string  // alternate key some AIs use
  suggestedTokenName?: string
  suggestedTokenSymbol?: string
  suggestedTokenDescription?: string
}

export type ValidationResult =
  | { ok: true; parsed: ParsedValidatorResponse }
  | { ok: false; reason: string }

/**
 * Validates and sanitizes a parsed AI validator response.
 * Multiple data-point checks: schema, allowed values, length limits, and content safety.
 */
export function validateValidatorResponse(parsed: ParsedValidatorResponse): ValidationResult {
  // 1. Required content: itemDescription or suggestedTitle must exist
  const desc = typeof parsed.itemDescription === 'string' ? parsed.itemDescription.trim() : ''
  const title = typeof parsed.suggestedTitle === 'string' ? parsed.suggestedTitle.trim() : ''
  if (!desc && !title) {
    return { ok: false, reason: 'Missing itemDescription and suggestedTitle' }
  }

  // 2. Block harmful content in all string fields
  const stringsToCheck = [
    desc,
    title,
    String(parsed.suggestedPrice ?? ''),
    String(parsed.suggestedTokenName ?? ''),
    String(parsed.suggestedTokenSymbol ?? ''),
    String(parsed.suggestedTokenDescription ?? ''),
  ]
  if (stringsToCheck.some(containsBlockedContent)) {
    return { ok: false, reason: 'Blocked content in response' }
  }

  // 3. Category must be in allowed list
  const category = String(parsed.category ?? '').trim().toLowerCase()
  const validCategory = CATEGORIES.includes(category) ? category : 'for-sale'

  // 4. Subcategory must be in allowed list
  const subcategory = String(parsed.subcategory ?? '').trim().toLowerCase()
  const validSubcategory = SUBCATEGORIES_FOR_SALE.includes(subcategory)
    ? subcategory
    : validCategory === 'for-sale'
      ? 'other'
      : 'other'

  // 5. searchKeywords: must be array of strings, limited count and length
  let keywords: string[] = []
  if (Array.isArray(parsed.searchKeywords)) {
    keywords = parsed.searchKeywords
      .filter((k): k is string => typeof k === 'string')
      .map((k) => k.trim())
      .filter((k) => k.length > 0 && k.length <= LIMITS.keywordLength)
      .slice(0, LIMITS.searchKeywords)
    // Block harmful content in keywords
    if (keywords.some(containsBlockedContent)) {
      return { ok: false, reason: 'Blocked content in searchKeywords' }
    }
  }

  // 6. Price format: must look like a reasonable number (optional). Accept suggestedPrice or price.
  const priceStr = typeof parsed.suggestedPrice === 'string' ? parsed.suggestedPrice.trim() : (typeof parsed.price === 'string' ? parsed.price.trim() : '')
  if (priceStr && priceStr.length > LIMITS.suggestedPrice) {
    return { ok: false, reason: 'suggestedPrice too long' }
  }
  if (priceStr) {
    const num = parseFloat(priceStr.replace(/[,$]/g, ''))
    if (!Number.isFinite(num) || num < 0 || num > 1e9) {
      return { ok: false, reason: 'suggestedPrice invalid or out of range' }
    }
  }

  // 7. Apply length limits to all text fields
  const safe: ParsedValidatorResponse = {
    itemDescription: desc.slice(0, LIMITS.itemDescription) || undefined,
    suggestedTitle: title.slice(0, LIMITS.suggestedTitle) || undefined,
    suggestedPrice: priceStr.slice(0, LIMITS.suggestedPrice) || undefined,
    category: validCategory,
    subcategory: validSubcategory,
    searchKeywords: keywords,
    suggestedTokenName: String(parsed.suggestedTokenName ?? '').trim().slice(0, LIMITS.suggestedTokenName) || undefined,
    suggestedTokenSymbol: String(parsed.suggestedTokenSymbol ?? '').trim().slice(0, LIMITS.suggestedTokenSymbol) || undefined,
    suggestedTokenDescription: String(parsed.suggestedTokenDescription ?? '').trim().slice(0, LIMITS.suggestedTokenDescription) || undefined,
  }

  return { ok: true, parsed: safe }
}

/**
 * Extract JSON object from raw content (handles markdown, prose, etc.)
 */
function extractJson(text: string): string | null {
  let s = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const brace = s.indexOf('{')
  if (brace >= 0) {
    let depth = 0
    let end = -1
    for (let i = brace; i < s.length; i++) {
      if (s[i] === '{') depth++
      else if (s[i] === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    if (end >= 0) return s.slice(brace, end + 1)
  }
  return null
}

/**
 * Parse raw_content string and validate. Returns ValidationResult.
 */
export function parseAndValidateValidatorResponse(rawContent: string): ValidationResult {
  try {
    const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    let parsed: ParsedValidatorResponse
    try {
      parsed = JSON.parse(cleaned) as ParsedValidatorResponse
    } catch {
      const jsonStr = extractJson(cleaned)
      if (!jsonStr) return { ok: false, reason: 'Invalid JSON in response' }
      parsed = JSON.parse(jsonStr) as ParsedValidatorResponse
    }
    return validateValidatorResponse(parsed)
  } catch {
    return { ok: false, reason: 'Invalid JSON in response' }
  }
}
