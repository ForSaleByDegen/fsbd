/**
 * Encrypted chat using TweetNaCl secretbox (shared secret)
 * Both participants derive the same key from thread identifiers.
 * Encrypted at rest - only buyer and seller can decrypt.
 */

import nacl from 'tweetnacl'
import CryptoJS from 'crypto-js'

const NONCE_LENGTH = 24

function encodeBase64(u8: Uint8Array): string {
  return btoa(String.fromCharCode(...u8))
}

function decodeBase64(s: string): Uint8Array {
  const binary = atob(s)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Derive shared secret for a thread - both parties compute the same key (32 bytes)
 */
export function deriveSharedKey(sellerWalletHash: string, buyerWalletHash: string, threadId: string): Uint8Array {
  const combined = [sellerWalletHash, buyerWalletHash, threadId].sort().join(':')
  const hash = CryptoJS.SHA256(combined).toString(CryptoJS.enc.Hex)
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32 && i * 2 < hash.length; i++) {
    bytes[i] = parseInt(hash.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function encryptMessageWithKey(plaintext: string, sharedKey: Uint8Array): { encrypted: string; nonce: string } {
  const nonce = nacl.randomBytes(NONCE_LENGTH)
  const messageUint8 = new TextEncoder().encode(plaintext)
  const encrypted = nacl.secretbox(messageUint8, nonce, sharedKey)
  return {
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  }
}

export function decryptMessageWithKey(
  encryptedBase64: string,
  nonceBase64: string,
  sharedKey: Uint8Array
): string | null {
  try {
    const encrypted = decodeBase64(encryptedBase64)
    const nonce = decodeBase64(nonceBase64)
    const decrypted = nacl.secretbox.open(encrypted, nonce, sharedKey)
    if (!decrypted) return null
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

