/**
 * POST /api/validators/register
 * Register as an AI validator. Requires whitelist + min $FSBD balance.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { checkRateLimit } from '@/lib/rate-limit'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { getUserTokenBalance } from '@/lib/tier-check'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

async function isWhitelisted(wallet: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value_json')
    .eq('key', 'ai_validators_whitelist')
    .maybeSingle()
  const raw = (data as { value_json?: unknown } | null)?.value_json
  const list = Array.isArray(raw) ? raw : []
  const addresses = list.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim().toLowerCase())
  return addresses.includes(wallet.toLowerCase())
}

export async function POST(request: NextRequest) {
  const rateLimited = checkRateLimit(request, 'validatorRegister')
  if (rateLimited) return rateLimited

  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const endpointUrl = typeof body.endpoint_url === 'string' ? body.endpoint_url.trim() : ''
    const validatorType = typeof body.validator_type === 'string' && body.validator_type === 'browser' ? 'browser' : 'endpoint'
    const stakeAmount = typeof body.stake_amount === 'number' ? body.stake_amount : Number(body.stake_amount)

    if (!wallet || !BASE58.test(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }
    if (validatorType === 'endpoint' && (!endpointUrl || endpointUrl.length < 10)) {
      return NextResponse.json({ error: 'Valid endpoint URL required for endpoint validators' }, { status: 400 })
    }
    if (!Number.isFinite(stakeAmount) || stakeAmount < 0) {
      return NextResponse.json({ error: 'Valid stake_amount required' }, { status: 400 })
    }

    // Enforce admin-configured minimum stake
    let minStake = 0
    if (supabaseAdmin) {
      const { data: cfg } = await supabaseAdmin.from('platform_config').select('value_json').eq('key', 'min_validator_stake').maybeSingle()
      const v = (cfg as { value_json?: unknown } | null)?.value_json
      if (typeof v === 'number' && v >= 0) minStake = Math.floor(v)
    }
    if (stakeAmount < minStake) {
      return NextResponse.json(
        { error: `Minimum stake required: ${minStake.toLocaleString()} $FSBD` },
        { status: 400 }
      )
    }

    const whitelisted = await isWhitelisted(wallet)
    let isAdminWallet = false
    if (supabaseAdmin) {
      const walletHash = hashWalletAddress(wallet)
      const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('wallet_address_hash', walletHash).eq('is_active', true).maybeSingle()
      isAdminWallet = !!adminRow
    }
    if (!whitelisted && !isAdminWallet) {
      return NextResponse.json({ error: 'Wallet not whitelisted for validator access' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    // Verify balance >= stake_amount
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)
    const mintOverride = await (async () => {
      const { data } = await supabaseAdmin.from('platform_config').select('value_json').eq('key', 'fsbd_token_mint').maybeSingle()
      const v = (data as { value_json?: unknown } | null)?.value_json
      if (typeof v === 'string' && v && v !== 'FSBD_TOKEN_MINT_PLACEHOLDER') return v
      if (typeof v === 'object' && v !== null && 'value' in v && typeof (v as { value: unknown }).value === 'string') return (v as { value: string }).value
      return null
    })()
    const balance = await getUserTokenBalance(wallet, connection, mintOverride)
    if (balance < stakeAmount) {
      return NextResponse.json(
        { error: `Insufficient $FSBD. You hold ${Math.floor(balance).toLocaleString()}; need ${Math.floor(stakeAmount).toLocaleString()} to stake.` },
        { status: 400 }
      )
    }

    let cleanUrl: string | null = null
    if (validatorType === 'endpoint') {
      let url = endpointUrl
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`
      try {
        new URL(url)
      } catch {
        return NextResponse.json({ error: 'Invalid endpoint URL format' }, { status: 400 })
      }
      cleanUrl = url.replace(/\/$/, '')
    }

    const walletHash = hashWalletAddress(wallet)
    const { error } = await supabaseAdmin
      .from('ai_validators')
      .upsert(
        {
          wallet_address_hash: walletHash,
          wallet_address: wallet,
          endpoint_url: cleanUrl,
          validator_type: validatorType,
          stake_amount: Math.floor(stakeAmount),
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address_hash' }
      )

    if (error) {
      console.error('[validators/register]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: 'Registered as validator' })
  } catch (e) {
    console.error('[validators/register]', e)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
