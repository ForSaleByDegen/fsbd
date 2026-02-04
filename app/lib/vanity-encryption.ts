/**
 * Server-only encryption for vanity pool secret keys.
 * Uses VANITY_POOL_ENCRYPTION_KEY (never NEXT_PUBLIC_) so the key stays server-side.
 */
import CryptoJS from 'crypto-js'

const getKey = () => {
  const k = process.env.VANITY_POOL_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!k || k.length < 16) {
    throw new Error('VANITY_POOL_ENCRYPTION_KEY or ENCRYPTION_KEY (32+ chars) required for vanity pool')
  }
  return k
}

export function encryptVanitySecret(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, getKey()).toString()
}

export function decryptVanitySecret(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, getKey())
  const out = bytes.toString(CryptoJS.enc.Utf8)
  if (!out) throw new Error('Decryption failed')
  return out
}
