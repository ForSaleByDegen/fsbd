/**
 * GET /api/mint-logo-nft/config
 * Returns public config for the logo NFT mint (price, enabled, etc.)
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const enabled = !!(
    process.env.LOGO_NFT_TREASURY?.trim() &&
    process.env.LOGO_NFT_METADATA_URI?.trim()
  )
  return NextResponse.json({
    enabled,
    priceSol: 0.01,
  })
}
