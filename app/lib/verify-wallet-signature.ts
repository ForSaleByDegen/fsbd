/**
 * Verify Ed25519 wallet signature for marketplace write actions.
 * Prevents impersonation: caller must prove they control the wallet.
 */
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes

export type MarketplaceAction = 'create_listing' | 'connect_woocommerce' | 'sync_marketplace'

export function verifyWalletSignature(
  wallet: string,
  message: string,
  signature: string,
  action: MarketplaceAction
): boolean {
  if (!wallet || !BASE58.test(wallet)) return false
  if (!message || typeof message !== 'string') return false
  if (!signature || typeof signature !== 'string') return false

  const expectedPrefix = `FSBD marketplace ${action} `
  if (!message.startsWith(expectedPrefix)) return false

  const timestampStr = message.slice(expectedPrefix.length).trim()
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp) || timestamp <= 0) return false

  const age = Date.now() - timestamp
  if (age < 0 || age > MAX_AGE_MS) return false

  try {
    const pubkey = new PublicKey(wallet)
    const msgBytes = new TextEncoder().encode(message)
    const sigBytes = Buffer.from(signature, 'base64')
    if (sigBytes.length !== 64) return false

    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkey.toBytes())
  } catch {
    return false
  }
}
