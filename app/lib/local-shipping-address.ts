/**
 * Client-side encrypted shipping address storage.
 * Address is stored in localStorage, never sent to server.
 * User can lock with PIN or wallet signature.
 */

import nacl from 'tweetnacl'
import CryptoJS from 'crypto-js'

const STORAGE_KEY_PREFIX = 'fsbd_ship_'
const NONCE_LENGTH = 24
const PBKDF2_ITERATIONS = 100000
const SIGN_MESSAGE = 'FSBD shipping address key'

export type AddressPayload = {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
}

export type StoredBlob = {
  method: 'pin' | 'signature'
  salt: string
  nonce: string
  encrypted: string
}

function encodeBase64(u8: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i])
  }
  return btoa(binary)
}

function decodeBase64(s: string): Uint8Array {
  const binary = atob(s)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function sha256ToKey(hex: string): Uint8Array {
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32 && i * 2 < hex.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Derive 32-byte key from PIN using PBKDF2 */
async function deriveKeyFromPin(pin: string, salt: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  return new Uint8Array(bits)
}

/** Derive 32-byte key from Ed25519 signature (SHA256 of signature bytes) */
function deriveKeyFromSignature(signature: Uint8Array): Uint8Array {
  const hex = Array.from(signature)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(hex)).toString(CryptoJS.enc.Hex)
  return sha256ToKey(hash)
}

/** Encrypt address with given key */
function encryptWithKey(plaintext: string, key: Uint8Array): { nonce: string; encrypted: string } {
  const nonce = nacl.randomBytes(NONCE_LENGTH)
  const messageUint8 = new TextEncoder().encode(plaintext)
  const encrypted = nacl.secretbox(messageUint8, nonce, key)
  return {
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted),
  }
}

/** Decrypt with given key */
function decryptWithKey(encryptedBase64: string, nonceBase64: string, key: Uint8Array): string | null {
  try {
    const encrypted = decodeBase64(encryptedBase64)
    const nonce = decodeBase64(nonceBase64)
    const decrypted = nacl.secretbox.open(encrypted, nonce, key)
    if (!decrypted) return null
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

function storageKey(wallet: string): string {
  return `${STORAGE_KEY_PREFIX}${wallet}`
}

export function hasStoredAddress(wallet: string): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(storageKey(wallet))
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as StoredBlob
    return !!(parsed.method && parsed.encrypted && parsed.nonce)
  } catch {
    return false
  }
}

export function getStoredBlob(wallet: string): StoredBlob | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(storageKey(wallet))
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredBlob
  } catch {
    return null
  }
}

export type PinOrSignFn =
  | { type: 'pin'; pin: string }
  | { type: 'signature'; signMessage: (msg: Uint8Array) => Promise<Uint8Array> }

/**
 * Save encrypted address. For PIN: pass { type: 'pin', pin }. For signature: pass { type: 'signature', signMessage }.
 */
export async function saveEncrypted(
  wallet: string,
  method: 'pin' | 'signature',
  address: AddressPayload,
  pinOrSign: PinOrSignFn
): Promise<boolean> {
  if (typeof window === 'undefined') return false

  let key: Uint8Array
  let salt: string

  if (method === 'pin') {
    if (pinOrSign.type !== 'pin') return false
    salt = wallet
    key = await deriveKeyFromPin(pinOrSign.pin, salt)
  } else {
    if (pinOrSign.type !== 'signature') return false
    const msg = new TextEncoder().encode(SIGN_MESSAGE)
    const sig = await pinOrSign.signMessage(msg)
    salt = wallet
    key = deriveKeyFromSignature(sig)
  }

  const plaintext = JSON.stringify(address)
  const { nonce, encrypted } = encryptWithKey(plaintext, key)

  const blob: StoredBlob = { method, salt, nonce, encrypted }
  try {
    localStorage.setItem(storageKey(wallet), JSON.stringify(blob))
    return true
  } catch {
    return false
  }
}

/**
 * Decrypt and return address. For PIN: pass { type: 'pin', pin }. For signature: pass { type: 'signature', signMessage }.
 */
export async function decryptAndGet(
  wallet: string,
  pinOrSign: PinOrSignFn
): Promise<AddressPayload | null> {
  const blob = getStoredBlob(wallet)
  if (!blob) return null

  let key: Uint8Array

  if (blob.method === 'pin') {
    if (pinOrSign.type !== 'pin') return null
    key = await deriveKeyFromPin(pinOrSign.pin, blob.salt)
  } else {
    if (pinOrSign.type !== 'signature') return null
    const msg = new TextEncoder().encode(SIGN_MESSAGE)
    const sig = await pinOrSign.signMessage(msg)
    key = deriveKeyFromSignature(sig)
  }

  const plaintext = decryptWithKey(blob.encrypted, blob.nonce, key)
  if (!plaintext) return null
  try {
    return JSON.parse(plaintext) as AddressPayload
  } catch {
    return null
  }
}

export function removeStoredAddress(wallet: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey(wallet))
}

/** Format address for chat message */
export function formatAddressForChat(addr: AddressPayload): string {
  const lines = [
    addr.name,
    addr.street1,
    ...(addr.street2 ? [addr.street2] : []),
    `${addr.city}, ${addr.state} ${addr.zip}`,
  ]
  return lines.join('\n')
}
