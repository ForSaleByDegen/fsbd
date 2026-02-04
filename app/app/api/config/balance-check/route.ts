/**
 * Server-side balance check for $FSBD token.
 * Uses platform_config + env for mint, server RPC for balance.
 * Helps debug tier issues when client shows 0.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount, getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'
import { getFsbdMintAddress, getUserTier, TIER_THRESHOLDS, type TierThresholds } from '@/lib/tier-check'
import { getTokenBalanceViaBitquery } from '@/lib/bitquery-balance'

const FSBD_PRODUCTION_MINT = 'A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump'

/** getParsedTokenAccountsByOwner with mint filter (some RPCs support this) */
async function getBalanceViaParsedAccounts(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey
): Promise<number> {
  const { value } = await connection.getParsedTokenAccountsByOwner(wallet, { mint })
  if (value.length === 0) return 0
  const info = value[0].account.data?.parsed?.info
  if (!info?.tokenAmount) return 0
  const ui = info.tokenAmount.uiAmount
  return typeof ui === 'number' ? ui : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
}

/** Get ALL token accounts for wallet, then filter by mint - works when mint filter fails on some RPCs */
async function getBalanceViaAllAccounts(
  connection: Connection,
  wallet: PublicKey,
  mintAddress: string
): Promise<number> {
  const { value } = await connection.getParsedTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ID })
  const mintLower = mintAddress.toLowerCase()
  for (const item of value) {
    const info = item.account.data?.parsed?.info
    const m = info?.mint
    if (m && String(m).toLowerCase() === mintLower && info?.tokenAmount) {
      const ui = info.tokenAmount.uiAmount
      return typeof ui === 'number' ? ui : Number(info.tokenAmount.amount || 0) / Math.pow(10, info.tokenAmount.decimals || 6)
    }
  }
  return 0
}

async function fetchBalanceForMint(
  connection: Connection,
  userKey: PublicKey,
  mint: PublicKey,
  mintStr: string
): Promise<number> {
  let balance = 0
  try {
    balance = await getBalanceViaParsedAccounts(connection, userKey, mint)
  } catch { /* ignore */ }
  if (balance > 0) return balance
  try {
    const ata = await getAssociatedTokenAddress(mint, userKey)
    const account = await getAccount(connection, ata)
    const mintInfo = await getMint(connection, mint)
    return Number(account.amount) / 10 ** mintInfo.decimals
  } catch { /* ignore */ }
  try {
    balance = await getBalanceViaAllAccounts(connection, userKey, mintStr)
  } catch { /* ignore */ }
  return balance
}

function getChatMinTokens(rows: { key: string; value_json: unknown }[]): number {
  const row = rows?.find((r) => r.key === 'chat_min_tokens')
  if (!row) return 10000
  const v = (row as { value_json: unknown }).value_json
  if (typeof v === 'number' && v >= 0) return Math.floor(v)
  if (typeof v === 'string') return parseInt(v, 10) || 10000
  return 10000
}

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

function getTierThresholdsFromConfig(rows: { key: string; value_json: unknown }[]): TierThresholds {
  const num = (k: string) => {
    const r = rows?.find((x) => x.key === k)
    if (!r) return undefined
    const v = (r as { value_json: unknown }).value_json
    return typeof v === 'number' ? v : parseInt(String(v), 10) || undefined
  }
  return {
    bronze: num('tier_bronze') ?? TIER_THRESHOLDS.bronze,
    silver: num('tier_silver') ?? TIER_THRESHOLDS.silver,
    gold: num('tier_gold') ?? TIER_THRESHOLDS.gold,
    platinum: num('tier_platinum') ?? TIER_THRESHOLDS.platinum,
  }
}

export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')?.trim()
    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    let mintOverride: string | null = null
    let chatMinTokens = 10000
    const client = supabaseAdmin || supabase
    if (client) {
      const { data } = await client.from('platform_config').select('key, value_json')
      const rows = (data as { key: string; value_json: unknown }[]) || []
      mintOverride = extractMintFromConfig(rows)
      chatMinTokens = getChatMinTokens(rows)
    }
    if (!mintOverride || mintOverride === 'FSBD_TOKEN_MINT_PLACEHOLDER') {
      mintOverride = process.env.NEXT_PUBLIC_FSBD_TOKEN_MINT || null
    }
    const userKey = new PublicKey(wallet)
    const prodMintKey = new PublicKey(FSBD_PRODUCTION_MINT)
    const debug = request.nextUrl.searchParams.get('debug') === '1'

    let balance = 0
    let mintToUse = FSBD_PRODUCTION_MINT
    const debugInfo: Record<string, unknown> = {}
    try {
      balance = await fetchBalanceForMint(connection, userKey, prodMintKey, FSBD_PRODUCTION_MINT)
      if (balance === 0) {
        const configuredMint = getFsbdMintAddress(mintOverride || undefined)
        if (configuredMint !== FSBD_PRODUCTION_MINT) {
          const alt = await fetchBalanceForMint(connection, userKey, new PublicKey(configuredMint), configuredMint)
          if (alt > 0) {
            balance = alt
            mintToUse = configuredMint
          }
        }
      }
      if (balance === 0) {
        const bitqueryBalance = await getTokenBalanceViaBitquery(wallet, prodMintKey.toString())
        if (debug) debugInfo.bitquery = bitqueryBalance
        if (bitqueryBalance > 0) {
          balance = bitqueryBalance
        }
      }
      if (debug) {
        debugInfo.mintUsed = mintToUse
        debugInfo.rpcHint = rpcUrl?.includes('mainnet') ? 'mainnet' : rpcUrl?.slice(0, 30) + '...'
      }
    } catch (err) {
      if (debug) debugInfo.error = err instanceof Error ? err.message : String(err)
      const errPayload: Record<string, unknown> = {
        balance: 0,
        tier: 'free',
        mintSet: true,
        mintSuffix: '...' + FSBD_PRODUCTION_MINT.slice(-8),
        chatMinTokens,
        hint: 'RPC failed. Ensure NEXT_PUBLIC_RPC_URL points to mainnet (e.g. Helius, QuickNode). Free RPCs may be rate-limited.',
      }
      if (debug) errPayload.debug = debugInfo
      return NextResponse.json(errPayload)
    }

    const tier = await getUserTier(wallet, connection, tierThresholds, balance > 0 ? mintToUse : mintOverride || undefined)

    const payload: Record<string, unknown> = {
      balance,
      tier,
      mintSet: true,
      mintSuffix: '...' + mintToUse.slice(-8),
      chatMinTokens,
      hint: balance === 0 ? 'Balance is 0. If you hold $FSBD, verify RPC is mainnet and Admin → Platform Config mint matches Phantom (Token → Details → Contract Address). Add BITQUERY_API_KEY for fallback.' : undefined,
    }
    if (debug && Object.keys(debugInfo).length > 0) payload.debug = debugInfo
    return NextResponse.json(payload)
  } catch (e) {
    console.error('Balance check error:', e)
    return NextResponse.json({ error: 'Balance check failed' }, { status: 500 })
  }
}
