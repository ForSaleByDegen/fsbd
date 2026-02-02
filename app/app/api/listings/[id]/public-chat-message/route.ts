/**
 * POST public chat message (plain, non-token-gated).
 * Uses service role to bypass RLS. Requires sender to hold minimum $FSBD (tier_bronze).
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { hashWalletAddress } from '@/lib/supabase'
import { getUserTokenBalance } from '@/lib/tier-check'

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

function getTierBronzeFromConfig(config: { key: string; value_json: unknown }[]): number {
  const row = config?.find((r) => r.key === 'tier_bronze')
  if (!row) return 100000
  const v = (row as { value_json: unknown }).value_json
  if (typeof v === 'number' && v >= 0) return Math.floor(v)
  if (typeof v === 'string') return parseInt(v, 10) || 100000
  return 100000
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    if (!listingId) {
      return NextResponse.json({ error: 'listing id required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const content = typeof body.content === 'string' ? body.content.trim().slice(0, 2000) : ''

    if (!wallet) {
      return NextResponse.json({ error: 'wallet required', code: 'WALLET_REQUIRED' }, { status: 400 })
    }
    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
    if (!rpcUrl) {
      return NextResponse.json({ error: 'RPC not configured' }, { status: 500 })
    }

    // Token-gate: require minimum $FSBD balance (tier_bronze) to chat
    let mintOverride: string | null = null
    let minTokens = 100000
    const client = supabaseAdmin || supabase
    if (client) {
      const { data } = await client.from('platform_config').select('key, value_json')
      const rows = (data as { key: string; value_json: unknown }[]) || []
      mintOverride = extractMintFromConfig(rows)
      minTokens = getTierBronzeFromConfig(rows)
    }
    if (!mintOverride) {
      mintOverride = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || null
    }

    const connection = new Connection(rpcUrl)
    const balance = await getUserTokenBalance(wallet, connection, mintOverride || undefined)

    if (balance < minTokens) {
      return NextResponse.json(
        {
          error: `Hold at least ${minTokens.toLocaleString()} $FSBD to chat`,
          code: 'INSUFFICIENT_TOKENS',
          minTokens,
          balance,
        },
        { status: 403 }
      )
    }

    const senderWalletHash = hashWalletAddress(wallet)

    const { error } = await supabaseAdmin.from('listing_public_messages').insert({
      listing_id: listingId,
      sender_wallet_hash: senderWalletHash,
      content,
    })

    if (error) {
      console.error('Public chat insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Public chat message error:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
