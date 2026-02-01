'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase } from '@/lib/supabase'
import { hashWalletAddress } from '@/lib/supabase'
import {
  getOrSelectThread,
  getThreadsForListing,
  sendEncryptedMessage,
  fetchMessages,
  updateThreadEscrow,
  getThread,
  type ChatMessage,
} from '@/lib/chat'
import {
  hasStoredAddress,
  getStoredBlob,
  decryptAndGet,
  formatAddressForChat,
} from '@/lib/local-shipping-address'
import { Button } from './ui/button'

interface ListingChatProps {
  listing: { id: string; wallet_address: string }
  currentUserWallet: string
  onEscrowProposed?: () => void
  onEscrowAccepted?: () => void
  onThreadLoaded?: (threadId: string, escrowAgreed: boolean, escrowStatus: string | null) => void
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
  const [allThreads, setAllThreads] = useState<{ id: string; buyer_wallet_hash: string }[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [loadingAddress, setLoadingAddress] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { signMessage } = useWallet()

  const sellerHash = hashWalletAddress(listing.wallet_address)
  const buyerHash = hashWalletAddress(currentUserWallet)
  const myHash = hashWalletAddress(currentUserWallet)
  const isSeller = currentUserWallet === listing.wallet_address

  useEffect(() => {
    if (!listing.id || !currentUserWallet) return
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) {
        cancelled = true
        setLoading(false)
      }
    }, 8000)
    ;(async () => {
      setLoading(true)
      try {
        const thread = await getOrSelectThread(listing.id, sellerHash, myHash, isSeller)
        if (cancelled) return
        if (thread) {
          setThreadId(thread.id)
          setThreadBuyerHash(thread.buyerWalletHash)
          if (isSeller) {
            const threads = await getThreadsForListing(listing.id, sellerHash)
            if (!cancelled) setAllThreads(threads)
          } else {
            setAllThreads([])
          }
          const msgs = await fetchMessages(thread.id, sellerHash, thread.buyerWalletHash)
          if (cancelled) return
          setMessages(msgs)
          const threadData = await getThread(thread.id)
          onThreadLoaded?.(thread.id, !!threadData?.escrow_agreed, threadData?.escrow_status ?? null)
        }
      } catch (err) {
        console.error('Chat load error:', err)
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [listing.id, currentUserWallet, sellerHash, myHash, isSeller, onThreadLoaded])

  // Supabase Realtime: new messages + escrow updates
  useEffect(() => {
    if (!threadId || !supabase) return
    const channel = supabase
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_threads', filter: `id=eq.${threadId}` },
        async () => {
          const threadData = await getThread(threadId)
          onThreadLoaded?.(threadId, !!threadData?.escrow_agreed, threadData?.escrow_status ?? null)
          if (threadBuyerHash) {
            const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
            setMessages(msgs)
          }
        }
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [threadId, sellerHash, threadBuyerHash, onThreadLoaded])

  // Polling fallback for real-time updates (if Realtime not enabled)
  useEffect(() => {
    if (!threadId || !threadBuyerHash || !supabase) return
    const interval = setInterval(async () => {
      try {
        const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
        setMessages((prev: ChatMessage[]) => {
          if (prev.length !== msgs.length || JSON.stringify(prev.map((p: ChatMessage) => p.id)) !== JSON.stringify(msgs.map((m) => m.id))) {
            return msgs
          }
          return prev
        })
        const threadData = await getThread(threadId)
        onThreadLoaded?.(threadId, !!threadData?.escrow_agreed, threadData?.escrow_status ?? null)
      } catch {
        // Ignore poll errors
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [threadId, sellerHash, threadBuyerHash, onThreadLoaded])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !threadId || !threadBuyerHash || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(threadId, sellerHash, threadBuyerHash, myHash, text)
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
    if (!threadId || !threadBuyerHash || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(
      threadId,
      sellerHash,
      threadBuyerHash,
      myHash,
      'I would like to use escrow for this transaction. Funds will be held until we agree on release.',
      'escrow_proposed'
    )
    if (ok) {
      await updateThreadEscrow(threadId, false, 'pending')
      onEscrowProposed?.()
      const msgs = await fetchMessages(threadId, sellerHash, threadBuyerHash)
      setMessages(msgs)
    }
    setSending(false)
  }

  const handleAcceptEscrow = async () => {
    if (!threadId || !threadBuyerHash || sending) return
    setSending(true)
    const ok = await sendEncryptedMessage(
      threadId,
      sellerHash,
      threadBuyerHash,
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

  const hasAddress = hasStoredAddress(currentUserWallet)
  const storedBlob = getStoredBlob(currentUserWallet)

  const handleUseSavedAddress = async (pin?: string) => {
    if (!currentUserWallet || loadingAddress) return
    const blob = storedBlob
    if (!blob) return
    setLoadingAddress(true)
    try {
      let addr
      if (blob.method === 'pin') {
        if (!pin) {
          setShowPinModal(true)
          setLoadingAddress(false)
          return
        }
        addr = await decryptAndGet(currentUserWallet, { type: 'pin', pin })
      } else {
        if (!signMessage) {
          alert('Wallet sign not available')
          setLoadingAddress(false)
          return
        }
        addr = await decryptAndGet(currentUserWallet, {
          type: 'signature',
          signMessage: (m) => signMessage(m),
        })
      }
      if (addr) {
        setInput(formatAddressForChat(addr))
        setShowPinModal(false)
        setPinInput('')
      } else {
        alert('Could not decrypt. Wrong PIN or sign cancelled.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load address')
    } finally {
      setLoadingAddress(false)
    }
  }

  const handlePinSubmit = () => {
    handleUseSavedAddress(pinInput)
  }

  const switchThread = async (tid: string, buyerHash: string) => {
    setThreadId(tid)
    setThreadBuyerHash(buyerHash)
    const msgs = await fetchMessages(tid, sellerHash, buyerHash)
    setMessages(msgs)
    const threadData = await getThread(tid)
    onThreadLoaded?.(tid, !!threadData?.escrow_agreed, threadData?.escrow_status ?? null)
  }

  if (!supabase) {
    return (
      <div className="p-4 border-2 border-[#660099] rounded text-center text-[#660099]">
        Chat requires Supabase. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then run migration_chat.sql.
      </div>
    )
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
        {isSeller
          ? 'No conversations yet. Buyers will see a chat when they view this listing.'
          : 'Could not load chat. Ensure Supabase is configured and the chat migration has been run.'}
      </div>
    )
  }

  return (
    <div className="border-2 border-[#660099] rounded overflow-hidden">
      <div className="bg-[#660099]/30 px-4 py-2 border-b border-[#660099] flex flex-col gap-2">
        <span className="text-sm font-pixel-alt text-[#00ff00]" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          💬 Encrypted Chat {isSeller ? '(Seller)' : '(Buyer)'}
        </span>
        {isSeller && allThreads.length > 1 && (
          <select
            value={threadId || ''}
            onChange={(e) => {
              const t = allThreads.find((x) => x.id === e.target.value)
              if (t) switchThread(t.id, t.buyer_wallet_hash)
            }}
            className="bg-black border border-[#660099] text-[#00ff00] text-xs font-pixel-alt px-2 py-1 rounded max-w-full"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            {allThreads.map((t, i) => (
              <option key={t.id} value={t.id}>
                Conversation {i + 1} (buyer …{t.buyer_wallet_hash.slice(-8)})
              </option>
            ))}
          </select>
        )}
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
      {!isSeller && hasAddress && (
        <div className="p-2 border-t border-[#660099]">
          <Button
            onClick={() => handleUseSavedAddress()}
            disabled={sending || loadingAddress}
            variant="outline"
            className="w-full border-2 border-[#aa77ee] text-[#aa77ee] hover:bg-[#aa77ee]/20 text-sm font-pixel-alt"
          >
            {loadingAddress ? '...' : 'Use my saved address'}
          </Button>
        </div>
      )}
      {/* Escrow buttons hidden until program launch */}
    </div>
  )
}
