/**
 * Chat API helpers - threads, messages (encrypted with shared secret)
 */

import { supabase } from './supabase'
import { hashWalletAddress } from './supabase'
import {
  deriveSharedKey,
  encryptMessageWithKey,
  decryptMessageWithKey,
} from './chat-encryption'

export async function getOrCreateThread(
  listingId: string,
  sellerWalletHash: string,
  buyerWalletHash: string
): Promise<{ id: string } | null> {
  if (!supabase) return null
  const { data: existing } = await supabase
    .from('chat_threads')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_wallet_hash', buyerWalletHash)
    .maybeSingle()

  if (existing) return { id: existing.id }

  const { data: inserted, error } = await supabase
    .from('chat_threads')
    .insert({
      listing_id: listingId,
      seller_wallet_hash: sellerWalletHash,
      buyer_wallet_hash: buyerWalletHash,
    })
    .select('id')
    .single()

  if (error || !inserted) return null
  return { id: inserted.id }
}

/** Get threads for a listing (for seller to pick a conversation) */
export async function getThreadsForListing(listingId: string, sellerWalletHash: string) {
  if (!supabase) return []
  const { data } = await supabase
    .from('chat_threads')
    .select('id, buyer_wallet_hash, created_at')
    .eq('listing_id', listingId)
    .eq('seller_wallet_hash', sellerWalletHash)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Get or select thread for current user (buyer creates; seller picks most recent) */
export async function getOrSelectThread(
  listingId: string,
  sellerWalletHash: string,
  currentUserHash: string,
  isSeller: boolean
): Promise<{ id: string; buyerWalletHash: string } | null> {
  if (isSeller) {
    const threads = await getThreadsForListing(listingId, sellerWalletHash)
    const first = threads[0]
    if (!first) return null
    return { id: first.id, buyerWalletHash: first.buyer_wallet_hash }
  }
  const thread = await getOrCreateThread(listingId, sellerWalletHash, currentUserHash)
  if (!thread) return null
  return { id: thread.id, buyerWalletHash: currentUserHash }
}

export async function sendEncryptedMessage(
  threadId: string,
  sellerWalletHash: string,
  buyerWalletHash: string,
  senderWalletHash: string,
  plaintext: string,
  messageType: 'text' | 'system' | 'escrow_proposed' | 'escrow_accepted' = 'text'
): Promise<boolean> {
  if (!supabase) return false

  const sharedKey = deriveSharedKey(sellerWalletHash, buyerWalletHash, threadId)
  const { encrypted, nonce } = encryptMessageWithKey(plaintext, sharedKey)

  const { error } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender_wallet_hash: senderWalletHash,
    encrypted_content: encrypted,
    nonce,
    message_type: messageType,
  })

  return !error
}

export type ChatMessage = {
  id: string
  sender_wallet_hash: string
  content: string
  message_type: string
  created_at: string
}

export async function fetchMessages(
  threadId: string,
  sellerWalletHash: string,
  buyerWalletHash: string
): Promise<ChatMessage[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, sender_wallet_hash, encrypted_content, nonce, message_type, created_at')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const sharedKey = deriveSharedKey(sellerWalletHash, buyerWalletHash, threadId)
  const decrypted: ChatMessage[] = []

  for (const m of data) {
    if (m.message_type === 'system') {
      decrypted.push({ id: m.id, sender_wallet_hash: m.sender_wallet_hash, content: m.encrypted_content, message_type: m.message_type, created_at: m.created_at })
      continue
    }
    const content = decryptMessageWithKey(m.encrypted_content, m.nonce, sharedKey)
    decrypted.push({
      id: m.id,
      sender_wallet_hash: m.sender_wallet_hash,
      content: content ?? '[Unable to decrypt]',
      message_type: m.message_type,
      created_at: m.created_at,
    })
  }
  return decrypted
}

export async function updateThreadEscrow(
  threadId: string,
  escrowAgreed: boolean,
  escrowStatus?: string
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('chat_threads')
    .update({
      escrow_agreed: escrowAgreed,
      ...(escrowStatus != null && { escrow_status: escrowStatus }),
    })
    .eq('id', threadId)
  return !error
}

export async function getThread(threadId: string) {
  if (!supabase) return null
  const { data } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('id', threadId)
    .single()
  return data
}

export async function hasAcceptedTerms(walletAddress: string): Promise<boolean> {
  if (!supabase) return true
  const walletHash = hashWalletAddress(walletAddress)
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('id')
    .eq('wallet_hash', walletHash)
    .limit(1)
  return !!data && data.length > 0
}

export async function acceptTerms(walletAddress: string): Promise<boolean> {
  if (!supabase) return true
  const walletHash = hashWalletAddress(walletAddress)
  const { error } = await supabase.from('terms_acceptances').insert({
    wallet_hash: walletHash,
    terms_version: '1.0',
  })
  return !error
}
