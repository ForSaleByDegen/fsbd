/**
 * Pinata IPFS Upload Functions
 * Uses Pinata REST API directly (no SDK needed)
 * Pinata is more reliable than NFT.Storage for production use
 */

// Get Pinata credentials from environment
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || ''
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'

/**
 * Upload image to IPFS via Pinata
 */
export async function uploadImageToIPFS(file: File): Promise<string> {
  // Check if API key is available
  const apiKey = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_PINATA_JWT || PINATA_JWT
    : PINATA_JWT
    
  if (!apiKey || apiKey.trim() === '') {
    console.error('Pinata JWT missing:', {
      hasKey: !!PINATA_JWT,
      keyLength: PINATA_JWT?.length || 0,
      envVar: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_PINATA_JWT : 'server-side'
    })
    throw new Error('Pinata JWT not configured. Please set NEXT_PUBLIC_PINATA_JWT in Vercel environment variables and redeploy.')
  }

  // Validate file
  if (!file || file.size === 0) {
    throw new Error('Invalid file: file is empty or not provided')
  }

  // Check file size (Pinata free tier: 1GB per file)
  const maxSize = 1024 * 1024 * 1024 // 1GB
  if (file.size > maxSize) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 1GB`)
  }

  try {
    // Use Pinata REST API directly (more reliable than SDK for client-side)
    // Upload original file without any compression or modification
    const formData = new FormData()
    // Pass file directly - no compression, no resizing, original quality preserved
    formData.append('file', file, file.name)

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // If response isn't JSON, use status text
      }
      
      const errorMessage = errorData.error?.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Pinata JWT is invalid or expired. Please check your NEXT_PUBLIC_PINATA_JWT in Vercel settings and redeploy.')
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      }
      
      throw new Error(`Failed to upload to Pinata: ${errorMessage}`)
    }

    const data = await response.json()
    const cid = data.IpfsHash

    if (!cid) {
      throw new Error('Upload succeeded but no CID returned')
    }
    
    // Return IPFS URL using Pinata gateway or public gateway
    return `https://${PINATA_GATEWAY}/ipfs/${cid}`
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error)
    const errorMessage = error?.message || 'Unknown error'
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.')
    }
    
    throw error // Re-throw with original error message
  }
}

/**
 * Upload multiple images to IPFS via Pinata
 */
export async function uploadMultipleImagesToIPFS(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) {
    return []
  }

  // Upload files sequentially to avoid rate limits
  const results: string[] = []
  for (const file of files) {
    try {
      const url = await uploadImageToIPFS(file)
      results.push(url)
    } catch (error: any) {
      console.error(`Error uploading file ${file.name}:`, error)
      throw new Error(`Failed to upload ${file.name}: ${error.message}`)
    }
  }
  
  return results
}

/**
 * Get IPFS gateway URL from CID
 */
export function getIPFSGatewayURL(cid: string): string {
  // Remove ipfs:// prefix if present
  const cleanCid = cid.replace('ipfs://', '').replace('https://ipfs.io/ipfs/', '').replace('https://gateway.pinata.cloud/ipfs/', '')
  return `https://${PINATA_GATEWAY}/ipfs/${cleanCid}`
}
