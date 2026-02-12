/**
 * Server-only encryption for OAuth tokens in seller_verifications.
 * Uses SELLER_VERIFICATION_ENCRYPTION_KEY (never NEXT_PUBLIC_) so the key stays server-side.
 */
import CryptoJS from 'crypto-js'

const getKey = () => {
  const k = process.env.SELLER_VERIFICATION_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!k || k.length < 16) {
    throw new Error('SELLER_VERIFICATION_ENCRYPTION_KEY or ENCRYPTION_KEY (32+ chars) required for seller verification tokens')
  }
  return k
}

export function encryptSellerToken(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, getKey()).toString()
}

export function decryptSellerToken(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, getKey())
  const out = bytes.toString(CryptoJS.enc.Utf8)
  if (!out) throw new Error('Decryption failed')
  return out
}
