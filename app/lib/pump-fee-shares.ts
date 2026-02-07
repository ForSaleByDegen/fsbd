/**
 * Pump Fees Program (pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ) instruction builders.
 * Reverse-engineered from mainnet transaction 4R8ncr1z1FLioNCa1UBUSwTt9UvexyTh2VNBzNpD7n6DLUfPeGrZLaPnhRCUGZnQ8DGRWcC5eLYLrA4tzBY7GGpq
 *
 * Instruction layout: 8-byte discriminator + vec of (Pubkey 32 bytes, share u16 LE).
 * Share is u16 where 65535 ≈ 100%. For 4.67% use ~3061, for 95.33% use ~62474.
 */
import { PublicKey } from '@solana/web3.js'

export const PUMP_FEES_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ')

export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')

/** Known accounts for update_fee_shares (from mainnet tx 3Ba9NTWCnHV2Ku6wSKfJfhsKuMM592hkyhh7C9ykpovD) */
export const PFEE_EVENT_AUTHORITY = new PublicKey('D6QxXDt6hhcCpto4HiZKkN2YQ2iZRF5R7S3caCHpUsML')
export const PFEE_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf')
export const PUMP_EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1')
export const PUMP_AMM_PROGRAM_ID = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA')
export const PUMP_AMM_EVENT_AUTHORITY = new PublicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR')

/**
 * Derive Sharing Config PDA for a pump.fun token mint.
 * Seeds: ["sharing-config", mint] (verified against mainnet)
 */
export function getSharingConfigForMint(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sharing-config'), mint.toBuffer()],
    PUMP_FEES_PROGRAM_ID
  )
}

/**
 * Derive Bonding Curve PDA for a pump.fun token mint.
 * Seeds: ["bonding-curve", mint]
 */
export function getBondingCurveForMint(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_PROGRAM_ID
  )
}

/**
 * Derive Creator Vault PDA. The bonding curve stores the sharing config at the creator offset;
 * the creator vault is derived from ["creator-vault", sharing_config] under the pump program.
 */
export function getCreatorVaultForSharingConfig(sharingConfig: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator-vault'), sharingConfig.toBuffer()],
    PUMP_PROGRAM_ID
  )
}

/**
 * update_fee_shares discriminator (from mainnet tx 3Ba9NTWCnHV2Ku6wSKfJfhsKuMM592hkyhh7C9ykpovD).
 * Instruction format: 8-byte discriminator + u32 LE vec length + (Pubkey 32 bytes, u16 LE share) per shareholder.
 */
const UPDATE_FEE_SHARES_DISCRIMINATOR = Buffer.from('bd0d8863bba4ed23', 'hex')

export type Shareholder = { pubkey: PublicKey; sharePercent: number }

/**
 * Convert percent (0-100) to u16 share. 65535 = 100%.
 */
export function percentToShare(percent: number): number {
  return Math.round((percent / 100) * 65535)
}

/**
 * Build instruction data for update_fee_shares.
 * Format: discriminator (8) + u32 LE length + (pubkey 32 + u16 LE share) per shareholder.
 * shareholders: array of { pubkey, sharePercent } where sharePercent is 0-100.
 */
export function buildUpdateFeeSharesData(shareholders: Shareholder[]): Buffer {
  const chunks: Buffer[] = [
    UPDATE_FEE_SHARES_DISCRIMINATOR,
    Buffer.alloc(4),
  ]
  chunks[1]!.writeUInt32LE(shareholders.length, 0)
  for (const { pubkey, sharePercent } of shareholders) {
    const share = Math.min(65535, Math.max(0, percentToShare(sharePercent)))
    const buf = Buffer.alloc(34)
    pubkey.toBuffer().copy(buf, 0)
    buf.writeUInt16LE(share, 32)
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}
