/**
 * useMobileWallet - provides signTransactions by wrapping MWA transact
 * Works with useAuthorization to reuse auth token and establish sessions.
 *
 * Dependencies: @solana-mobile/mobile-wallet-adapter-protocol-web3js,
 *   @solana-mobile/mobile-wallet-adapter-protocol
 */

import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'
import { useCallback } from 'react'
import useAuthorization, { APP_IDENTITY } from './useAuthorization'

export type SignTransactionsFn = (
  transactions: (Transaction | VersionedTransaction)[]
) => Promise<(Transaction | VersionedTransaction)[]>

export function useMobileWallet() {
  const {
    authorizeSession,
    authToken,
    deauthorizeSession,
    selectedAccount,
  } = useAuthorization()

  const signTransactions: SignTransactionsFn = useCallback(
    async (transactions) => {
      return transact(async (wallet) => {
        if (!authToken) {
          await authorizeSession(wallet)
        } else {
          await wallet.authorize({
            chain: 'solana:mainnet',
            identity: APP_IDENTITY,
            auth_token: authToken,
          })
        }
        return wallet.signTransactions({
          transactions,
        })
      })
    },
    [authToken, authorizeSession]
  )

  const disconnect = useCallback(async () => {
    return transact(async (wallet) => {
      await deauthorizeSession(wallet)
    })
  }, [deauthorizeSession])

  return {
    signTransactions,
    disconnect,
    selectedAccount,
  }
}
