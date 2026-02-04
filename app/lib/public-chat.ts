/**
 * Public chat per listing - community discussion
 * When listing has token: encrypted, token holders only.
 * When no token: unencrypted, anyone can read/post.
 */

import { supabase } from './supabase'

export type PublicChatMessage = {
  id: string
  sender_wallet_hash: string
  content: string
  created_at: string
  encrypted_content?: string | null
  nonce?: string | null
}

export async function fetchPublicMessages(listingId: string): Promise<PublicChatMessage[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('listing_public_messages')
    .select('id, sender_wallet_hash, content, encrypted_content, nonce, created_at')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []) as PublicChatMessage[]
}

/** Send plain public message (via API - uses service role, token-gated by $FSBD). Content can be plain text or JSON { text?, imageUrl? }. */
export async function sendPublicMessage(
  listingId: string,
  senderWallet: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = content.trim().slice(0, 2500)
  if (!trimmed) return { ok: false, error: 'Message is empty' }
  const res = await fetch(`/api/listings/${listingId}/public-chat-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet: senderWallet,
      content: trimmed,
    }),
  })
  if (res.ok) return { ok: true }
  const data = await res.json().catch(() => ({}))
  return { ok: false, error: data.error || `Failed to send (${res.status})` }
}

/** Send encrypted message to token-gated chat (via API - verifies holder server-side) */
export async function sendTokenGatedMessage(
  listingId: string,
  wallet: string,
  encryptedContent: string,
  nonce: string
): Promise<boolean> {
  const res = await fetch(`/api/listings/${listingId}/token-chat-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet,
      encrypted_content: encryptedContent,
      nonce,
    }),
  })
  return res.ok
}

/** Fetch chat key for token-gated listing (holder/seller only) */
export async function fetchTokenChatKey(
  listingId: string,
  wallet: string
): Promise<{ key: string; encrypted: boolean } | { encrypted: false } | { error: string } | null> {
  const res = await fetch(
    `/api/listings/${listingId}/token-chat-key?wallet=${encodeURIComponent(wallet)}`
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: (data as { error?: string }).error || 'Could not verify token access' }
  }
  return data
}
