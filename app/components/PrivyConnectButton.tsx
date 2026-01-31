'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function PrivyConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { connected } = useWallet()

  // Fallback to Solana wallet adapter if Privy not configured
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  if (!privyAppId) {
    return <WalletMultiButton />
  }

  if (!ready) {
    return (
      <div className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs md:text-sm">
        Loading...
      </div>
    )
  }

  if (authenticated || connected) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton />
        {authenticated && (
          <button
            onClick={logout}
            className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-xs md:text-sm transition-colors"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Disconnect
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={login}
      className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-xs md:text-sm transition-colors"
      style={{ fontFamily: 'var(--font-pixel-alt)' }}
    >
      Connect
    </button>
  )
}
