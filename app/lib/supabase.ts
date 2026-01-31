import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set. Using local storage fallback.')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

/**
 * Hash wallet address for privacy
 */
export function hashWalletAddress(address: string): string {
  return CryptoJS.SHA256(address).toString()
}

/**
 * Encrypt sensitive data before storing
 */
export function encryptData(data: string): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production'
  return CryptoJS.AES.encrypt(data, key).toString()
}

/**
 * Decrypt stored data
 */
export function decryptData(encryptedData: string): string {
  const key = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key-change-in-production'
  const bytes = CryptoJS.AES.decrypt(encryptedData, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}
