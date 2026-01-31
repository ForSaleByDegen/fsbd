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

  try {
    const client = new NFTStorage({ token: NFT_STORAGE_KEY })
    
    // Convert File to nft.storage File format
    const nftFile = new File([file], file.name, { type: file.type })
    
    // Upload to IPFS
    const cid = await client.storeBlob(nftFile)
    
    // Return IPFS URL
    return `https://ipfs.io/ipfs/${cid}`
  } catch (error) {
    console.error('Error uploading to NFT.Storage:', error)
    throw new Error('Failed to upload image to IPFS')
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
