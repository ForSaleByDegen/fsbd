'use client'

import { useEffect } from 'react'

/**
 * Catches WalletNotReadyError (and similar) from @solana/wallet-adapter
 * when user clicks connect before wallet extensions have loaded.
 */
export default function WalletErrorHandler() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg = event.message || ''
      if (
        msg.includes('WalletNotReadyError') ||
        msg.includes('Wallet not ready') ||
        msg.includes('WalletReadyState')
      ) {
        event.preventDefault()
        event.stopPropagation()
        // Show user-friendly message instead of console error
        if (typeof window !== 'undefined') {
          alert(
            'Wallet still loading. Please wait a moment and try again, or refresh the page.'
          )
        }
        return true
      }
      return false
    }

    window.addEventListener('error', handler as EventListener)
    return () => window.removeEventListener('error', handler as EventListener)
  }, [])

  return null
}
