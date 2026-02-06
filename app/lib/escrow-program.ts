/**
 * FSBD Escrow Program Client (2-of-3 Multisig)
 *
 * Three signers: buyer, seller, arbiter. Any 2 can release (to seller) or refund (to buyer).
 * Arbiter = platform admin, only signs when buyer/seller disagree.
 */

import { PublicKey } from '@solana/web3.js'

const ESCROW_PROGRAM_ID = process.env.NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID
const ARBITER_WALLET = process.env.NEXT_PUBLIC_ESCROW_ARBITER_WALLET

/**
 * Get the program ID. Throws if not configured.
 */
export function getEscrowProgramId(): PublicKey {
  if (!ESCROW_PROGRAM_ID) {
    throw new Error(
      'NEXT_PUBLIC_FSBD_ESCROW_PROGRAM_ID not set. Deploy the escrow program and add the program ID.'
    )
  }
  return new PublicKey(ESCROW_PROGRAM_ID)
}

/**
 * Get the arbiter (platform) wallet for escrow. Throws if not configured.
 */
export function getArbiterWallet(): PublicKey {
  if (!ARBITER_WALLET) {
    throw new Error(
      'NEXT_PUBLIC_ESCROW_ARBITER_WALLET not set. Set platform arbiter wallet for 2-of-3 multisig.'
    )
  }
  return new PublicKey(ARBITER_WALLET)
}

/**
 * Convert listing UUID to 32-byte seed.
 */
export function listingIdToSeed(listingId: string): Uint8Array {
  const buf = new Uint8Array(32)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(listingId)
  for (let i = 0; i < 32; i++) {
    buf[i] = i < bytes.length ? bytes[i] : 0
  }
  return buf
}

/**
 * Derive the escrow PDA for (listing, buyer, seller, arbiter).
 */
export function getEscrowPDA(
  listingId: string,
  buyer: PublicKey,
  seller: PublicKey,
  arbiter: PublicKey,
  programId?: PublicKey
): [PublicKey, number] {
  const program = programId ?? getEscrowProgramId()
  const seed = listingIdToSeed(listingId)
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      Buffer.from(seed),
      buyer.toBuffer(),
      seller.toBuffer(),
      arbiter.toBuffer(),
    ],
    program
  )
}

/**
 * Check if escrow program and arbiter are configured.
 */
export function isEscrowProgramConfigured(): boolean {
  return !!ESCROW_PROGRAM_ID && !!ARBITER_WALLET
}
