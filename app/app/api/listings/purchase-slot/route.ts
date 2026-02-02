/**
 * POST /api/listings/purchase-slot
 * Body: { wallet: string, signature: string }
 * Verifies a 10,000 $FSBD transfer to app wallet, then increments extra_paid_slots
 */
import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashWalletAddress } from '@/lib/supabase'
import { getFsbdMintAddress, EXTRA_LISTING_SLOT_COST_FSBD } from '@/lib/tier-check'

const SPL_TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = String(body?.wallet ?? '').trim()
    const signature = String(body?.signature ?? '').trim()
    if (!wallet || !signature) {
      return NextResponse.json({ error: 'Missing wallet or signature' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 })
    }

    const appWallet = process.env.NEXT_PUBLIC_APP_WALLET
    if (!appWallet || appWallet === 'YOUR_WALLET_ADDRESS') {
      return NextResponse.json({ error: 'App wallet not configured for slot purchases' }, { status: 503 })
    }

    let fsbdMint: string | null = null
    const { data: configRows } = await supabaseAdmin.from('platform_config').select('key, value_json')
    for (const row of configRows || []) {
      const key = (row as { key: string }).key
      const val = (row as { value_json: unknown }).value_json
      if (key === 'fsbd_token_mint' && typeof val === 'string') fsbdMint = val
    }
    const mintToUse = getFsbdMintAddress(fsbdMint || undefined)
    if (mintToUse === 'FSBD_TOKEN_MINT_PLACEHOLDER' || !mintToUse) {
      return NextResponse.json({ error: '$FSBD token not configured' }, { status: 503 })
    }

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    })
    if (!tx || tx.meta?.err) {
      return NextResponse.json({ error: 'Invalid or failed transaction' }, { status: 400 })
    }

    const userPubkey = new PublicKey(wallet)
    const appPubkey = new PublicKey(appWallet)
    const mintPubkey = new PublicKey(mintToUse)
    const appAta = getAssociatedTokenAddressSync(mintPubkey, appPubkey)
    const requiredAmount = BigInt(Math.floor(EXTRA_LISTING_SLOT_COST_FSBD * 1e6)) // assume 6 decimals

    let foundValidTransfer = false
    const instructions = tx.transaction.message.instructions
    for (const ix of instructions) {
      if ('parsed' in ix && ix.parsed && typeof ix.parsed === 'object') {
        const p = ix.parsed as { type?: string; info?: { source?: string; destination?: string; amount?: string; authority?: string } }
        if (p.type === 'transfer' || p.type === 'transferChecked') {
          const info = p.info
          if (!info) continue
          const source = info.source
          const dest = info.destination
          const amount = info.amount ? BigInt(info.amount) : 0n
          if (
            source &&
            dest &&
            amount >= requiredAmount &&
            dest === appAta.toBase58()
          ) {
            foundValidTransfer = true
            break
          }
        }
      }
    }
    if (!foundValidTransfer) {
      for (const ix of tx.transaction.message.instructions) {
        if ('innerInstructions' in ix && Array.isArray((ix as { innerInstructions?: unknown[] }).innerInstructions)) {
          for (const inner of (ix as { innerInstructions: { parsed?: { type?: string; info?: { source?: string; destination?: string; amount?: string } } }[] }).innerInstructions) {
            const p = inner?.parsed
            if (p?.type === 'transfer' || p?.type === 'transferChecked') {
              const info = p.info
              if (info?.destination === appAta.toBase58() && info?.amount && BigInt(info.amount) >= requiredAmount) {
                foundValidTransfer = true
                break
              }
            }
          }
        }
      }
    }
    const meta = tx.meta
    if (!foundValidTransfer && meta?.innerInstructions) {
      for (const innerGroup of meta.innerInstructions) {
        for (const inner of innerGroup.instructions) {
          const parsed = (inner as { parsed?: { type?: string; info?: { source?: string; destination?: string; amount?: string } } }).parsed
          if (parsed?.type === 'transfer' || parsed?.type === 'transferChecked') {
            const info = parsed.info
            if (info?.destination === appAta.toBase58() && info?.amount && BigInt(info.amount) >= requiredAmount) {
              foundValidTransfer = true
              break
            }
          }
        }
      }
    }

    if (!foundValidTransfer) {
      return NextResponse.json(
        { error: `Transaction must transfer ${EXTRA_LISTING_SLOT_COST_FSBD.toLocaleString()} $FSBD to the platform.` },
        { status: 400 }
      )
    }

    const walletHash = hashWalletAddress(wallet)
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, extra_paid_slots')
      .eq('wallet_address_hash', walletHash)
      .maybeSingle()

    let currentExtra = Number((existing as { extra_paid_slots?: number } | null)?.extra_paid_slots) || 0

    if (existing) {
      await supabaseAdmin
        .from('profiles')
        .update({ extra_paid_slots: currentExtra + 1, updated_at: new Date().toISOString() })
        .eq('wallet_address_hash', walletHash)
    } else {
      await supabaseAdmin.from('profiles').upsert(
        {
          wallet_address_hash: walletHash,
          wallet_address: wallet,
          email: 'wallet@fsbd.local',
          tier: 'free',
          listings_count: 0,
          total_fees_paid: 0,
          total_listings_sold: 0,
          extra_paid_slots: 1,
        } as Record<string, unknown>,
        { onConflict: 'wallet_address_hash' }
      )
      currentExtra = 1
    }

    return NextResponse.json({ success: true, extraSlots: existing ? currentExtra + 1 : 1 })
  } catch (e) {
    console.error('[purchase-slot]', e)
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 })
  }
}
