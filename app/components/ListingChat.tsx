'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { hashWalletAddress } from '@/lib/supabase'
import {
  getOrSelectThread,
  sendEncryptedMessage,
  fetchMessages,
  updateThreadEscrow,
  getThread,
  type ChatMessage,
} from '@/lib/chat'
import { Button } from './ui/button'

interface ListingChatProps {
  listing: { id: string; wallet_address: string }
  currentUserWallet: string
  onEscrowProposed?: () => void
  onEscrowAccepted?: () => void
}

export default function ListingChat({
  listing,
  currentUserWallet,
  onEscrowProposed,
  onEscrowAccepted,
  onThreadLoaded,
}: ListingChatProps) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadBuyerHash, setThreadBuyerHash] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sellerHash = hashWalletAddress(listing.wallet_address)
  const buyerHash = hashWalletAddress(currentUserWallet)
  const myHash = hashWalletAddress(currentUserWallet)
  const isSeller = currentUserWallet === listing.wallet_address

  useEffect(() => {
    if (!listing.id || !currentUserWallet) return
    ;(async () => {
      setLoading(true)
      const thread = await getOrSelectThread(listing.id, sellerHash, myHash, isSeller)
      if (thread) {
        setThreadId(thread.id)
        const msgs = await fetchMessages(thread.id, sellerHash, thread.buyerWalletHash)
        setMessages(msgs)
        const threadData = await getThread(thread.id)
        onThreadLoaded?.(thread.id, !!threadData?.escrow_agreed, threadData?.escrow_status ?? null)
      }
      setLoading(false)
    })()
  }, [listing.id, currentUserWallet, sellerHash, myHash, isSeller, onThreadLoaded])

  useEffect(() => {
    if (!threadId || !supabase) return
    const sub = supabase
      .channel(`chat:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async () => {
          if (threadBuyerHash) {
            const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
            setMessages(msgs)
          }
        }
      )
      .subscribe()
    return () => {
      sub.unsubscribe()
    }
  }, [threadId, sellerHash, threadBuyerHash])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !threadId || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(threadId, sellerHash, buyerHash, myHash, text)
    if (ok) {
      setInput('')
      const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
      setMessages(msgs)
    } else {
      alert('Failed to send message')
    }
    setSending(false)
  }

  const handleProposeEscrow = async () => {
    if (!threadId || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(
      threadId,
      sellerHash,
      buyerHash,
      myHash,
      'I would like to use escrow for this transaction. Funds will be held until we agree on release.',
      'escrow_proposed'
    )
    if (ok) {
      await updateThreadEscrow(threadId, false, 'pending')
      onEscrowProposed?.()
      const msgs = await fetchMessages(threadId, sellerHash, buyerHash)
      setMessages(msgs)
    }
    setSending(false)
  }

  const handleAcceptEscrow = async () => {
    if (!threadId || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(
      threadId,
      sellerHash,
      buyerHash,
      myHash,
      'I agree to use escrow. Proceed with depositing funds.',
      'escrow_accepted'
    )
    if (ok && threadBuyerHash) {
      await updateThreadEscrow(threadId, true, 'pending')
      onEscrowAccepted?.()
      const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
      setMessages(msgs)
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="p-4 border-2 border-[#660099] rounded text-center text-[#660099]">
        Loading chat...
      </div>
    )
  }

  if (!threadId) {
    return (
      <div className="p-4 border-2 border-[#660099] rounded text-center text-[#660099]">
        Could not load chat. Please try again.
      </div>
    )
  }

  return (
    <div className="border-2 border-[#660099] rounded overflow-hidden">
      <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099]">
        <span className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          💬 Encrypted Chat {isSeller ? '(Seller)' : '(Buyer)'}
        </span>
      </div>
      <div className="h-64 overflow-y-auto p-3 space-y-2 bg-black/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_wallet_hash === myHash ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded ${
                m.sender_wallet_hash === myHash
                  ? 'bg-[#00ff00]/20 border border-[#00ff00]'
                  : 'bg-[#660099]/20 border border-[#660099]'
              }`}
            >
              {m.message_type === 'escrow_proposed' && (
                <span className="text-xs text-[#ff00ff] block mb-1">🔒 Escrow proposed</span>
              )}
              {m.message_type === 'escrow_accepted' && (
                <span className="text-xs text-[#00ff00] block mb-1">✓ Escrow accepted</span>
              )}
              <p className="text-sm text-[#00ff00] break-words" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                {m.content}
              </p>
              <p className="text-xs text-[#660099] mt-1">
                {new Date(m.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-2 border-t border-[#660099] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-black border-2 border-[#660099] px-3 py-2 text-[#00ff00] placeholder-[#660099]/60 rounded font-pixel-alt text-sm"
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black px-4"
        >
          Send
        </Button>
      </div>
      {!isSeller && (
        <div className="p-2 border-t border-[#660099] flex gap-2">
          <Button
            onClick={handleProposeEscrow}
            disabled={sending}
            variant="outline"
            className="flex-1 border-2 border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff]/20 text-sm"
          >
            Propose Escrow
          </Button>
          <Button
            onClick={handleAcceptEscrow}
            disabled={sending}
            variant="outline"
            className="flex-1 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 text-sm"
          >
            Accept Escrow
          </Button>
        </div>
      )}
    </div>
  )
}
