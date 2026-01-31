'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'

// Dynamic import for Privy to avoid build issues
let usePrivyHook: any = null
let useWalletsHook: any = null

if (typeof window !== 'undefined') {
  try {
    const privyModule = require('@privy-io/react-auth')
    usePrivyHook = privyModule.usePrivy
    useWalletsHook = privyModule.useWallets
  } catch {
    // Privy not available
  }
}

export default function PrivyConnectButton() {
  const { connected } = useWallet()
  const [privyReady, setPrivyReady] = useState(false)
  const [privyAuth, setPrivyAuth] = useState(false)
  const [privyLogin, setPrivyLogin] = useState<(() => void) | null>(null)
  const [privyLogout, setPrivyLogout] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (usePrivyHook) {
      try {
        const privy = usePrivyHook()
        setPrivyReady(privy.ready)
        setPrivyAuth(privy.authenticated)
        setPrivyLogin(() => privy.login)
        setPrivyLogout(() => privy.logout)
      } catch {
        // Privy not initialized
      }
    }
  }, [])

  // Fallback to Solana wallet adapter if Privy not configured
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
  if (!privyAppId || !usePrivyHook) {
    return <WalletMultiButton />
  }

  if (!privyReady) {
    return (
      <div className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] font-pixel-alt text-xs md:text-sm">
        Loading...
      </div>
    )
  }

  if (privyAuth || connected) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton />
        {privyAuth && privyLogout && (
          <button
            onClick={privyLogout}
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
      onClick={privyLogin || undefined}
      className="px-4 py-2 border-2 border-[#660099] text-[#00ff00] hover:bg-[#660099] hover:text-black font-pixel-alt text-xs md:text-sm transition-colors"
      style={{ fontFamily: 'var(--font-pixel-alt)' }}
    >
      Connect
    </button>
  )
}
