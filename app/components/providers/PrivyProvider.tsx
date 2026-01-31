'use client'

import { ReactNode, useEffect, useState } from 'react'

export default function PrivyProvider({ children }: { children: ReactNode }) {
  const [PrivyProviderBase, setPrivyProviderBase] = useState<any>(null)
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  
  useEffect(() => {
    // Only load Privy if App ID is set and in browser
    if (appId && typeof window !== 'undefined') {
      try {
        const privyModule = require('@privy-io/react-auth')
        setPrivyProviderBase(() => privyModule.PrivyProvider)
      } catch (error) {
        console.warn('Privy not available:', error)
      }
    }
  }, [appId])
  
  if (!appId || !PrivyProviderBase) {
    return <>{children}</>
  }

  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'],
        appearance: {
          theme: 'dark',
          accentColor: '#660099',
          logo: '/icon-192.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        solanaChains: [
          {
            id: 'solana-devnet',
            network: 'devnet',
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
          },
        ],
      }}
    >
      {children}
    </PrivyProviderBase>
  )
}
