/**
 * Server-side balance check for $FSBD token.
 * Uses platform_config + env for mint, server RPC for balance.
 * Helps debug tier issues when client shows 0.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { getFsbdMintAddress, getUserTier } from '@/lib/tier-check'

function extractMintFromConfig(data: { key: string; value_json: unknown }[]): string | null {
  const row = data?.find((r) => r.key === 'fsbd_token_mint')
  if (!row) return null
  const v = row.value_json
  if (typeof v === 'string' && v && v !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return v
  if (typeof v === 'object' && v !== null && 'value' in v && typeof (v as { value: unknown }).value === 'string') {
    return (v as { value: string }).value
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
    if (!rpcUrl) {
      return NextResponse.json({ error: 'RPC not configured' }, { status: 500 })
    }

    const connection = new Connection(rpcUrl)

    let mintOverride: string | null = null
    const client = supabaseAdmin || supabase
    if (client) {
      const { data } = await client.from('platform_config').select('key, value_json')
      mintOverride = extractMintFromConfig((data as { key: string; value_json: unknown }[]) || [])
    }
    if (!mintOverride) {
      mintOverride = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || null
    }
    if (!mintOverride || mintOverride === 'FSBD_TOKEN_MINT_PLACEHOLDER') {
      return NextResponse.json({
        balance: 0,
        tier: 'free',
        mintSet: false,
        hint: 'Set $FSBD contract address in Admin → Platform Config, or NEXT_PUBLIC_FSBD_TOKEN_MINT in Vercel.',
      })
    }

    const mintToUse = getFsbdMintAddress(mintOverride)
    const mintKey = new PublicKey(mintToUse)
    const userKey = new PublicKey(wallet)

    let balance = 0
    try {
      const ata = await getAssociatedTokenAddress(mintKey, userKey)
      const account = await getAccount(connection, ata)
      const mint = await getMint(connection, mintKey)
      balance = Number(account.amount) / 10 ** mint.decimals
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({
        balance: 0,
        tier: 'free',
        mintSet: true,
        mintSuffix: '...' + mintToUse.slice(-8),
        error: msg,
        hint: 'Token account may not exist, or RPC failed. Verify mint address matches your $FSBD token.',
      })
    }

    const tier = await getUserTier(wallet, connection, undefined, mintOverride)

    return NextResponse.json({
      balance,
      tier,
      mintSet: true,
      mintSuffix: '...' + mintToUse.slice(-8),
    })
  } catch (e) {
    console.error('Balance check error:', e)
    return NextResponse.json({ error: 'Balance check failed' }, { status: 500 })
  }
}
