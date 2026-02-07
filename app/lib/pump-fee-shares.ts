/**
 * Pump Fees Program (pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ) instruction builders.
 * Reverse-engineered from mainnet transaction 4R8ncr1z1FLioNCa1UBUSwTt9UvexyTh2VNBzNpD7n6DLUfPeGrZLaPnhRCUGZnQ8DGRWcC5eLYLrA4tzBY7GGpq
 *
 * Instruction layout: 8-byte discriminator + vec of (Pubkey 32 bytes, share u16 LE).
 * Share is u16 where 65535 ≈ 100%. For 4.67% use ~3061, for 95.33% use ~62474.
 */
import { PublicKey } from '@solana/web3.js'

export const PUMP_FEES_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ')

/** update_fee_shares discriminator (first 8 bytes of instruction data) */
const UPDATE_FEE_SHARES_DISCRIMINATOR = Buffer.from('df8542e5cd842a65', 'hex')

export type Shareholder = { pubkey: PublicKey; sharePercent: number }

/**
 * Convert percent (0-100) to u16 share. 65535 = 100%.
 */
export function percentToShare(percent: number): number {
  return Math.round((percent / 100) * 65535)
}

/**
 * Build instruction data for update_fee_shares.
 * shareholders: array of { pubkey, sharePercent } where sharePercent is 0-100.
 * Total should sum to 100 (or close; program may normalize).
 */
export function buildUpdateFeeSharesData(shareholders: Shareholder[]): Buffer {
  const chunks: Buffer[] = [UPDATE_FEE_SHARES_DISCRIMINATOR]
  for (const { pubkey, sharePercent } of shareholders) {
    const share = Math.min(65535, Math.max(0, percentToShare(sharePercent)))
    const buf = Buffer.alloc(34)
    pubkey.toBuffer().copy(buf, 0)
    buf.writeUInt16LE(share, 32)
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}
