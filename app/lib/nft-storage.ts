import { NFTStorage, File } from 'nft.storage'

// Get NFT.Storage API key from environment
const NFT_STORAGE_KEY = process.env.NEXT_PUBLIC_NFT_STORAGE_KEY || ''

/**
 * Upload image to IPFS via NFT.Storage
 */
export async function uploadImageToIPFS(file: File): Promise<string> {
  if (!NFT_STORAGE_KEY) {
    throw new Error('NFT.Storage API key not configured. Set NEXT_PUBLIC_NFT_STORAGE_KEY')
  }

  // Validate file
  if (!file || file.size === 0) {
    throw new Error('Invalid file: file is empty or not provided')
  }

  // Check file size (NFT.Storage has limits)
  const maxSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxSize) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 100MB`)
  }

  try {
    const client = new NFTStorage({ token: NFT_STORAGE_KEY })
    
    // Upload blob directly (simpler and more reliable)
    const cid = await client.storeBlob(file)
    
    if (!cid) {
      throw new Error('Upload succeeded but no CID returned')
    }
    
    // Return IPFS URL
    return `https://ipfs.io/ipfs/${cid}`
  } catch (error: any) {
    console.error('Error uploading to NFT.Storage:', error)
    const errorMessage = error?.message || 'Unknown error'
    
    // Check for specific error types
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('401') || errorMessage.includes('invalid token')) {
      throw new Error('NFT.Storage API key is invalid or expired. Please check your NEXT_PUBLIC_NFT_STORAGE_KEY in Vercel settings')
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a moment.')
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.')
    }
    
    throw new Error(`Failed to upload image to IPFS: ${errorMessage}`)
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultipleImagesToIPFS(files: File[]): Promise<string[]> {
  const uploads = await Promise.all(files.map(file => uploadImageToIPFS(file)))
  return uploads
}

/**
 * Get IPFS gateway URL from CID
 */
export function getIPFSGatewayURL(cid: string): string {
  // Remove ipfs:// prefix if present
  const cleanCid = cid.replace('ipfs://', '')
  return `https://ipfs.io/ipfs/${cleanCid}`
}
