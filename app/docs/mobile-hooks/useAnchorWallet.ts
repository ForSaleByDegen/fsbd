/**
 * useAnchorWallet - Anchor-compatible wallet for use with Anchor Provider/Program
 * Depends on useMobileWallet and useAuthorization.
 *
 * Dependencies: @solana/web3.js
 */

import {
  PublicKey,
  type Transaction,
  type VersionedTransaction,
} from '@solana/web3.js'
import { useMemo } from 'react'
import useMobileWallet from './useMobileWallet'
import useAuthorization from './useAuthorization'

export interface AnchorWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]>
}

export function useAnchorWallet(): AnchorWallet | undefined {
  const { selectedAccount } = useAuthorization()
  const { signTransactions } = useMobileWallet()

  return useMemo(() => {
    if (!selectedAccount || !signTransactions) return

    // Convert @solana/addresses Address to web3.js PublicKey (Address is base58 string)
    const publicKey = new PublicKey(selectedAccount.publicKey as string)

    return {
      get publicKey() {
        return publicKey
      },
      signTransaction: async <T extends Transaction | VersionedTransaction>(
        transaction: T
      ): Promise<T> => {
        const signed = await signTransactions([transaction])
        return signed[0] as T
      },
      signAllTransactions: async <
        T extends Transaction | VersionedTransaction
      >(transactions: T[]): Promise<T[]> => {
        return (await signTransactions(transactions)) as T[]
      },
    }
  }, [signTransactions, selectedAccount])
}
