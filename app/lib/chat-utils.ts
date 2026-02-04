/**
 * Chat message format utilities.
 * Supports text and image URLs - backward compatible with plain text.
 */

export type ChatPayload = { text?: string; imageUrl?: string }

/** Parse message content - supports JSON { text?, imageUrl? } or plain string */
export function parseChatContent(content: string): ChatPayload {
  if (!content || typeof content !== 'string') return {}
  const trimmed = content.trim()
  if (!trimmed) return {}
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const text = typeof parsed.text === 'string' ? parsed.text.trim() : undefined
      const imageUrl = typeof parsed.imageUrl === 'string' && /^https?:\/\//.test(parsed.imageUrl) ? parsed.imageUrl : undefined
      if (text || imageUrl) return { text: text || undefined, imageUrl }
    } catch {
      /* fall through to plain text */
    }
  }
  return { text: trimmed }
}

/** Build payload string for encryption/storage */
export function buildChatPayload(payload: ChatPayload): string {
  if (payload.imageUrl && !payload.text) {
    return JSON.stringify({ imageUrl: payload.imageUrl })
  }
  if (payload.imageUrl && payload.text) {
    return JSON.stringify({ text: payload.text, imageUrl: payload.imageUrl })
  }
  return payload.text || ''
}
