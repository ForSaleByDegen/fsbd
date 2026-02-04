'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { hashWalletAddress } from '@/lib/supabase'
import {
  fetchPublicMessages,
  sendPublicMessage,
  sendTokenGatedMessage,
  fetchTokenChatKey,
  type PublicChatMessage,
} from '@/lib/public-chat'
import {
  encryptMessageWithKey,
  decryptMessageWithKey,
} from '@/lib/chat-encryption'
import { Button } from './ui/button'
import { useTier } from './providers/TierProvider'

interface ListingPublicChatProps {
  listingId: string
  currentUserWallet: string
  tokenMint?: string | null
  sellerWallet?: string | null
  chatMinTokens?: number
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export default function ListingPublicChat({
  listingId,
  currentUserWallet,
  tokenMint,
  sellerWallet,
  chatMinTokens = 1,
}: ListingPublicChatProps) {
  const [messages, setMessages] = useState<PublicChatMessage[]>([])
  const [decryptedMessages, setDecryptedMessages] = useState<Array<{ id: string; sender_wallet_hash: string; content: string; created_at: string }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [chatKey, setChatKey] = useState<Uint8Array | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldScrollToEndRef = useRef(false)
  const { tier: tierState } = useTier()
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!currentUserWallet) return
    fetch(`/api/admin/check?wallet=${encodeURIComponent(currentUserWallet)}`)
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d?.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [currentUserWallet])
  const isSeller = !!(sellerWallet && currentUserWallet === sellerWallet)
  const canChatByFsbd = tierState.loading && !isAdmin && !isSeller ? null : isAdmin || isSeller || (tierState.balance >= tierState.chatMinTokens)
  const fsbdChatError = tierState.error && !isAdmin && !isSeller
    ? tierState.error
    : !tierState.loading && !isAdmin && !isSeller && canChatByFsbd === false
      ? `Hold at least ${tierState.chatMinTokens.toLocaleString()} $FSBD to post in public chat`
      : null
  const myHash = hashWalletAddress(currentUserWallet)
  const isTokenGated = !!(tokenMint && tokenMint.trim())

  const decryptMessages = useCallback(
    (msgs: PublicChatMessage[], key: Uint8Array) => {
      return msgs.map((m) => {
        if (m.encrypted_content && m.nonce) {
          const dec = decryptMessageWithKey(m.encrypted_content, m.nonce, key)
          return {
            id: m.id,
            sender_wallet_hash: m.sender_wallet_hash,
            content: dec ?? '[Unable to decrypt]',
            created_at: m.created_at,
          }
        }
        return {
          id: m.id,
          sender_wallet_hash: m.sender_wallet_hash,
          content: m.content,
          created_at: m.created_at,
        }
      })
    },
    []
  )

  useEffect(() => {
    if (!listingId) return
    if (isTokenGated) {
      fetchTokenChatKey(listingId, currentUserWallet)
        .then((result) => {
          if (!result) {
            setKeyError('Could not verify token access')
            setLoading(false)
            return
          }
          if ('error' in result && result.error) {
            setKeyError(result.error)
            setChatKey(null)
            setLoading(false)
            return
          }
          if ('encrypted' in result && result.encrypted === false) {
            setKeyError(null)
            setChatKey(null)
            setLoading(false)
            return
          }
          if ('key' in result && result.key) {
            setChatKey(base64ToUint8Array(result.key))
            setKeyError(null)
          } else {
            setKeyError('Hold the listing token to access this chat')
            setChatKey(null)
          }
          setLoading(false)
        })
        .catch(() => {
          setKeyError('Could not verify token access')
          setLoading(false)
        })
    } else {
      setKeyError(null)
      setChatKey(null)
      setLoading(false)
    }
  }, [listingId, currentUserWallet, isTokenGated])

  useEffect(() => {
    if (!listingId || !supabase) return
    const load = async () => {
      const msgs = await fetchPublicMessages(listingId)
      if (isTokenGated && chatKey) {
        setDecryptedMessages(decryptMessages(msgs, chatKey))
      } else if (!isTokenGated) {
        setMessages(msgs)
      }
    }
    load()
  }, [listingId, isTokenGated, chatKey, decryptMessages])

  useEffect(() => {
    if (!listingId || !supabase) return
    const load = () => {
      fetchPublicMessages(listingId).then((msgs) => {
        if (isTokenGated && chatKey) {
          setDecryptedMessages(decryptMessages(msgs, chatKey))
        } else if (!isTokenGated) {
          setMessages(msgs)
        }
      })
    }
    const channel = supabase
      .channel(`public-chat:${listingId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'listing_public_messages', filter: `listing_id=eq.${listingId}` },
        load
      )
      .subscribe()
    return () => {
      void channel.unsubscribe()
    }
  }, [listingId, isTokenGated, chatKey, decryptMessages])

  useEffect(() => {
    if (!listingId || !supabase) return
    const interval = setInterval(() => {
      fetchPublicMessages(listingId).then((msgs) => {
        if (isTokenGated && chatKey) {
          setDecryptedMessages(decryptMessages(msgs, chatKey))
        } else if (!isTokenGated) {
          setMessages((prev) => (prev.length !== msgs.length ? msgs : prev))
        }
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [listingId, isTokenGated, chatKey, decryptMessages])

  useEffect(() => {
    if (shouldScrollToEndRef.current) {
      shouldScrollToEndRef.current = false
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, decryptedMessages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      if (isTokenGated && chatKey) {
        const { encrypted, nonce } = encryptMessageWithKey(text, chatKey)
        const ok = await sendTokenGatedMessage(listingId, currentUserWallet, encrypted, nonce)
        if (ok) {
          setInput('')
          const msgs = await fetchPublicMessages(listingId)
          setDecryptedMessages(decryptMessages(msgs, chatKey))
        } else {
          alert('Failed to send message')
        }
      } else {
        const result = await sendPublicMessage(listingId, currentUserWallet, text)
        if (result.ok) {
          setInput('')
          shouldScrollToEndRef.current = true
          const msgs = await fetchPublicMessages(listingId)
          setMessages(msgs)
        } else {
          alert(result.error || 'Failed to send message. Ensure you are connected and hold the minimum $FSBD to chat.')
        }
      }
    } finally {
      setSending(false)
    }
  }

  const displaySender = (hash: string) => {
    if (hash === myHash) return 'You'
    return `User …${hash.slice(-6)}`
  }

  const displayMessages = isTokenGated && chatKey ? decryptedMessages : messages
  const fsbdOk = canChatByFsbd === true
  // Token-gated: only listing token required. Non-token-gated: $FSBD required (spam filter).
  const canSend = isTokenGated ? !!chatKey : fsbdOk

  if (!supabase) return null

  if (loading) {
    return (
      <div className="p-4 border-2 border-[#660099] rounded text-center text-[#660099] text-sm font-pixel-alt">
        Loading public chat...
      </div>
    )
  }

  if (isTokenGated && keyError) {
    return (
      <div className="border-2 border-[#660099] rounded overflow-hidden">
        <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099]">
          <span className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            🔐 Token-gated Chat — holders only
          </span>
        </div>
        <div className="p-4 text-center text-[#aa77ee] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {keyError}
        </div>
      </div>
    )
  }

  return (
    <div className="border-2 border-[#660099] rounded overflow-hidden">
      <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099]">
        <span className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          {isTokenGated ? '🔐 Token-gated Chat — holders only (encrypted)' : '🌐 Public Chat — community discussion'}
        </span>
      </div>
      <div className="h-48 overflow-y-auto p-3 space-y-2 bg-black/50">
        {displayMessages.length === 0 ? (
          <p className="text-[#660099]/80 text-sm font-pixel-alt">No messages yet. Start the conversation!</p>
        ) : (
          displayMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender_wallet_hash === myHash ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] px-3 py-2 rounded ${
                  m.sender_wallet_hash === myHash
                    ? 'bg-[#00ff00]/20 border border-[#00ff00]'
                    : 'bg-[#660099]/20 border border-[#660099]'
                }`}
              >
                <p className="text-xs text-[#aa77ee] mb-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {displaySender(m.sender_wallet_hash)}
                </p>
                <p className="text-sm text-[#00ff00] break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {m.content}
                </p>
                <p className="text-xs text-[#660099] mt-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 border-t border-[#660099]">
        {canChatByFsbd === false && fsbdChatError && (
          <p className="text-xs text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {fsbdChatError}
          </p>
        )}
        <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={canSend ? 'Message the community...' : isTokenGated ? (chatMinTokens === 1 ? 'Hold the listing token to post' : `Hold at least ${chatMinTokens.toLocaleString()} tokens to post`) : !fsbdOk ? (canChatByFsbd === null ? 'Checking…' : 'Hold $FSBD to chat') : 'Message...'}
          maxLength={2000}
          disabled={!canSend}
          className="flex-1 bg-black border-2 border-[#660099] px-3 py-2 text-[#00ff00] placeholder-[#660099]/60 rounded font-pixel-alt text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim() || !canSend}
          className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black px-4"
        >
          {sending ? '…' : 'Send'}
        </Button>
        </div>
      </div>
    </div>
  )
}
