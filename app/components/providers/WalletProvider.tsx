'use client'

import { useEffect } from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { initSuppressWalletWarnings } from '@/lib/suppress-wallet-warnings'
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'
import TierProvider from './TierProvider'
import '@solana/wallet-adapter-react-ui/styles.css'

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet-beta'
    ? WalletAdapterNetwork.Mainnet
    : WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network)
  }, [network])
  const config = useMemo(() => ({ commitment: 'confirmed' as const }), [])

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  )

  useEffect(() => {
    initSuppressWalletWarnings()
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TierProvider>
            {children}
          </TierProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  )
}
