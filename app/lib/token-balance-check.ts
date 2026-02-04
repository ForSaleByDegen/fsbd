/**
 * Token balance check for token-gated chat.
 * Checks if wallet holds the listing token with balance >= minRequired.
 */

import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'

/** Get holder balance for a given mint and wallet. Returns 0 if none. */
export async function getHolderBalance(
  connection: Connection,
  mintAddress: string,
  walletAddress: string
): Promise<number> {
  const mint = new PublicKey(mintAddress)
  const wallet = new PublicKey(walletAddress)

  try {
    const ata = await getAssociatedTokenAddress(mint, wallet)
    const account = await getAccount(connection, ata)
    const mintInfo = await getMint(connection, mint)
    return Number(account.amount) / 10 ** mintInfo.decimals
  } catch {
    return 0
  }
}
