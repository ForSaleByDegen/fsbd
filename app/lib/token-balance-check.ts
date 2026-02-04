/**
 * Robust token balance check for token-gated features.
 * Supports both standard SPL Token and Token-2022 programs (e.g. pump.fun, Jupiter).
 */

import { Connection, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token'

/** Get holder balance for a given mint and wallet. Returns 0 if none. */
export async function getHolderBalance(
  connection: Connection,
  mintAddress: string,
  walletAddress: string
): Promise<number> {
  const mint = new PublicKey(mintAddress)
  const wallet = new PublicKey(walletAddress)
  const mintLower = mintAddress.toLowerCase()

  // 1. Try getParsedTokenAccountsByOwner with mint filter (works on many RPCs)
  try {
    const { value } = await connection.getParsedTokenAccountsByOwner(wallet, { mint })
    if (value.length > 0) {
      const info = value[0].account.data?.parsed?.info
      if (info?.tokenAmount) {
        const ui = info.tokenAmount.uiAmount
        const amount =
          typeof ui === 'number' ? ui : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
        if (amount > 0) return amount
      }
    }
  } catch {
    /* ignore */
  }

  // 2. Try standard ATA (Token Program)
  try {
    const ata = await getAssociatedTokenAddress(mint, wallet)
    const account = await getAccount(connection, ata)
    const mintInfo = await getMint(connection, mint)
    const balance = Number(account.amount) / 10 ** mintInfo.decimals
    if (balance > 0) return balance
  } catch {
    /* ignore */
  }

  // 3. Scan all Token Program accounts
  try {
    const { value } = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    })
    for (const item of value) {
      const info = item.account.data?.parsed?.info
      const m = info?.mint
      if (m && String(m).toLowerCase() === mintLower && info?.tokenAmount) {
        const ui = info.tokenAmount.uiAmount
        const amount =
          typeof ui === 'number'
            ? ui
            : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
        if (amount > 0) return amount
      }
    }
  } catch {
    /* ignore */
  }

  // 4. Scan all Token-2022 accounts
  try {
    const { value } = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: TOKEN_2022_PROGRAM_ID,
    })
    for (const item of value) {
      const info = item.account.data?.parsed?.info
      const m = info?.mint
      if (m && String(m).toLowerCase() === mintLower && info?.tokenAmount) {
        const ui = info.tokenAmount.uiAmount
        const amount =
          typeof ui === 'number'
            ? ui
            : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
        if (amount > 0) return amount
      }
    }
  } catch {
    /* ignore */
  }

  return 0
}
