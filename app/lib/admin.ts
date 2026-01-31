import { supabase, hashWalletAddress, getSupabaseClientWithWallet } from './supabase'

export type AdminRole = 'admin' | 'moderator'
export type AdminPermission = 'manage_listings' | 'manage_users' | 'view_analytics' | 'manage_admins'

export interface AdminUser {
  id: string
  wallet_address_hash: string
  wallet_address: string
  role: AdminRole
  permissions: AdminPermission[]
  is_active: boolean
  created_at: string
}

/**
 * Check if a wallet address is an admin
 */
export async function isAdmin(walletAddress: string): Promise<boolean> {
  if (!supabase) return false
  
  try {
    const walletHash = hashWalletAddress(walletAddress)
    const { data, error } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('wallet_address_hash', walletHash)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error || !data) return false
    return true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get admin user details
 */
export async function getAdminUser(walletAddress: string): Promise<AdminUser | null> {
  if (!supabase) return null
  
  try {
    const walletHash = hashWalletAddress(walletAddress)
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('wallet_address_hash', walletHash)
      .eq('is_active', true)
      .single()
    
    if (error || !data) return null
    return data as AdminUser
  } catch (error) {
    console.error('Error fetching admin user:', error)
    return null
  }
}

/**
 * Check if admin has specific permission
 */
export async function hasPermission(
  walletAddress: string,
  permission: AdminPermission
): Promise<boolean> {
  const admin = await getAdminUser(walletAddress)
  if (!admin) return false
  
  // Admins have all permissions
  if (admin.role === 'admin') return true
  
  // Check moderator permissions
  return admin.permissions.includes(permission)
}

/**
 * Get all admins (admin only)
 */
export async function getAllAdmins(): Promise<AdminUser[]> {
  if (!supabase) return []
  
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching admins:', error)
      return []
    }
    
    return (data || []) as AdminUser[]
  } catch (error) {
    console.error('Error fetching admins:', error)
    return []
  }
}

/**
 * Get user profile stats
 */
export async function getUserProfile(walletAddress: string) {
  if (!supabase) return null
  
  try {
    // Use client with wallet hash for RLS
    const client = getSupabaseClientWithWallet(walletAddress) || supabase
    const walletHash = hashWalletAddress(walletAddress)
    
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('wallet_address_hash', walletHash)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching profile:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
  walletAddress: string,
  updates: {
    email?: string
    tier?: 'free' | 'bronze' | 'silver' | 'gold'
    listings_count?: number
    total_fees_paid?: number
  }
) {
  if (!supabase) return null
  
  try {
    // Use client with wallet hash for RLS
    const client = getSupabaseClientWithWallet(walletAddress) || supabase
    const walletHash = hashWalletAddress(walletAddress)
    
    const { data, error } = await client
      .from('profiles')
      .upsert({
        wallet_address_hash: walletHash,
        wallet_address: walletAddress, // Will be encrypted by app
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address_hash',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error upserting profile:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error upserting profile:', error)
    return null
  }
}

/**
 * Increment user's listing count
 */
export async function incrementListingCount(walletAddress: string) {
  if (!supabase) return
  
  try {
    const walletHash = hashWalletAddress(walletAddress)
    const { data: profile } = await supabase
      .from('profiles')
      .select('listings_count')
      .eq('wallet_address_hash', walletHash)
      .single()
    
    const newCount = (profile?.listings_count || 0) + 1
    
    await supabase
      .from('profiles')
      .update({ listings_count: newCount })
      .eq('wallet_address_hash', walletHash)
  } catch (error) {
    console.error('Error incrementing listing count:', error)
  }
}

/**
 * Add to user's total fees paid
 */
export async function addToTotalFees(walletAddress: string, amount: number) {
  if (!supabase) return
  
  try {
    const walletHash = hashWalletAddress(walletAddress)
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_fees_paid')
      .eq('wallet_address_hash', walletHash)
      .single()
    
    const newTotal = (profile?.total_fees_paid || 0) + amount
    
    await supabase
      .from('profiles')
      .update({ total_fees_paid: newTotal })
      .eq('wallet_address_hash', walletHash)
  } catch (error) {
    console.error('Error updating total fees:', error)
  }
}
