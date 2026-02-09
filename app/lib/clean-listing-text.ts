/**
 * Clean AI-generated text for display in listings.
 * Strips markdown code fences, JSON artifacts, and normalizes whitespace.
 */
export function cleanListingText(text: string): string {
  if (!text || typeof text !== 'string') return ''
  let out = text
    .replace(/^```(?:json)?\s*/gi, '')
    .replace(/\s*```\s*$/gi, '')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
  return out.slice(0, 5000)
}
