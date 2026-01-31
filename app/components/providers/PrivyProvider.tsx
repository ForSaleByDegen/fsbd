'use client'

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth'
import { ReactNode } from 'react'

export default function PrivyProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''
  
  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID not set - Privy features will be disabled')
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
