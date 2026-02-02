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

export async function sendPublicMessage(
  listingId: string,
  senderWalletHash: string,
  content: string
): Promise<boolean> {
  if (!supabase) return false
  const trimmed = content.trim().slice(0, 2000)
  if (!trimmed) return false
  const { error } = await supabase.from('listing_public_messages').insert({
    listing_id: listingId,
    sender_wallet_hash: senderWalletHash,
    content: trimmed,
  })
  return !error
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
): Promise<{ key: string; encrypted: boolean } | { encrypted: false } | null> {
  const res = await fetch(
    `/api/listings/${listingId}/token-chat-key?wallet=${encodeURIComponent(wallet)}`
  )
  if (!res.ok) return null
  return res.json()
}
