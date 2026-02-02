'use client'

import { useState } from 'react'
import ListingPublicChat from './ListingPublicChat'
import ListingChat from './ListingChat'

interface ListingChatSectionProps {
  listing: { id: string; wallet_address: string; has_token?: boolean; token_mint?: string | null }
  currentUserWallet: string
  onEscrowProposed?: () => void
  onEscrowAccepted?: () => void
  onThreadLoaded?: (threadId: string, escrowAgreed: boolean, escrowStatus: string | null) => void
}

export default function ListingChatSection({
  listing,
  currentUserWallet,
  onEscrowProposed,
  onEscrowAccepted,
  onThreadLoaded,
}: ListingChatSectionProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public')

  const tabClass = (tab: 'public' | 'private') =>
    `px-3 py-2 text-sm font-pixel-alt border-2 transition-colors touch-manipulation ${
      activeTab === tab
        ? 'bg-[#660099] text-black border-[#660099]'
        : 'bg-transparent text-[#660099] border-[#660099] hover:bg-[#660099]/20 hover:text-[#00ff00]'
    }`

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('public')}
          className={tabClass('public')}
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          🌐 Public Chat
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('private')}
          className={tabClass('private')}
          style={{ fontFamily: 'var(--font-pixel-alt)' }}
        >
          🔒 Private DM (encrypted)
        </button>
      </div>
      {activeTab === 'public' && (
        <ListingPublicChat
          listingId={listing.id}
          currentUserWallet={currentUserWallet}
          tokenMint={listing.has_token ? listing.token_mint : null}
          sellerWallet={listing.wallet_address}
        />
      )}
      {activeTab === 'private' && (
        <div>
          <p className="text-xs text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            P2P encrypted — only you and the other party can read these messages. Each buyer has a separate thread.
          </p>
          <ListingChat
            listing={listing}
            currentUserWallet={currentUserWallet}
            onEscrowProposed={onEscrowProposed}
            onEscrowAccepted={onEscrowAccepted}
            onThreadLoaded={onThreadLoaded}
          />
        </div>
      )}
    </div>
  )
}
