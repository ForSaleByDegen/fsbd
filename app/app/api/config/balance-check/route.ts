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

const FSBD_PRODUCTION_MINT = 'A8sdJBY6UGErXW2gNVT6s13Qn4FJwGyRp63Y5mZBpump'

/** Fallback: use getParsedTokenAccountsByOwner when ATA lookup fails (some RPCs/tokens work better) */
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

    async function fetchBalance(mint: PublicKey): Promise<number> {
      try {
        const ata = await getAssociatedTokenAddress(mint, userKey)
        const account = await getAccount(connection, ata)
        const mintInfo = await getMint(connection, mint)
        return Number(account.amount) / 10 ** mintInfo.decimals
      } catch {
        return getBalanceViaParsedAccounts(connection, userKey, mint)
      }
    }

    let balance = 0
    let mintToUse = FSBD_PRODUCTION_MINT
    try {
      balance = await fetchBalance(prodMintKey)
      if (balance === 0) {
        const configuredMint = getFsbdMintAddress(mintOverride || undefined)
        if (configuredMint !== FSBD_PRODUCTION_MINT) {
          const alt = await fetchBalance(new PublicKey(configuredMint))
          if (alt > 0) {
            balance = alt
            mintToUse = configuredMint
          }
        }
      }
    } catch {
      return NextResponse.json({
        balance: 0,
        tier: 'free',
        mintSet: true,
        mintSuffix: '...' + FSBD_PRODUCTION_MINT.slice(-8),
        chatMinTokens,
        hint: 'RPC failed. Ensure NEXT_PUBLIC_RPC_URL points to mainnet (e.g. Helius, QuickNode). Free RPCs may be rate-limited.',
      })
    }

    const tier = await getUserTier(wallet, connection, undefined, balance > 0 ? mintToUse : mintOverride || undefined)

    return NextResponse.json({
      balance,
      tier,
      mintSet: true,
      mintSuffix: '...' + mintToUse.slice(-8),
      chatMinTokens,
      hint: balance === 0 ? 'Balance is 0. If you hold $FSBD, verify RPC is mainnet and Admin → Platform Config mint matches Phantom (Token → Details → Contract Address).' : undefined,
    })
  } catch (e) {
    console.error('Balance check error:', e)
    return NextResponse.json({ error: 'Balance check failed' }, { status: 500 })
  }
}
