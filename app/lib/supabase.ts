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
 * Get Supabase client with wallet hash set in JWT claims for RLS
 * This allows RLS policies to identify the user
 */
export function getSupabaseClientWithWallet(walletAddress: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null
  
  const walletHash = hashWalletAddress(walletAddress)
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'x-wallet-hash': walletHash
      }
    }
  })
}

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
