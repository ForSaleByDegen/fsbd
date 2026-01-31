import { create } from 'ipfs-http-client'

// Use public IPFS gateway for demo (in production, use your own node)
const ipfsClient = create({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: process.env.NEXT_PUBLIC_INFURA_IPFS_AUTH || ''
  }
})

/**
 * Upload file to IPFS
 * Returns IPFS hash (CID)
 */
export async function uploadToIPFS(file: File): Promise<string> {
  try {
    const result = await ipfsClient.add(file)
    return result.path
  } catch (error) {
    console.error('IPFS upload error:', error)
    throw new Error('Failed to upload to IPFS')
  }
}

/**
 * Get IPFS gateway URL from hash
 */
export function getIPFSURL(hash: string): string {
  // Use public gateway (in production, use your own)
  return `https://ipfs.io/ipfs/${hash}`
}

/**
 * Upload multiple files to IPFS
 */
export async function uploadMultipleToIPFS(files: File[]): Promise<string[]> {
  const hashes = await Promise.all(files.map(file => uploadToIPFS(file)))
  return hashes
}
