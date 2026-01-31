'use client'

import { ReactNode } from 'react'

export default function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  
  // If no App ID, skip Privy entirely
  if (!appId || typeof window === 'undefined') {
    return <>{children}</>
  }

  // Dynamic import to avoid build errors
  try {
    const { PrivyProvider: PrivyProviderBase } = require('@privy-io/react-auth')
    
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
  } catch (error) {
    // Privy not available - return children without wrapper
    console.warn('Privy not available, using fallback:', error)
    return <>{children}</>
  }
}
