/**
 * Admin-only: Lister airdrop - snapshot and execute
 * POST { wallet, action: 'snapshot' | 'execute', snapshotId?: string }
 *
 * Requires AIRDROP_SOURCE_KEYPAIR_BASE64 in env (base64-encoded JSON keypair array).
 * Run migration_lister_airdrop.sql first.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Connection } from '@solana/web3.js'
import { isAdmin } from '@/lib/admin'
import {
  getUniqueListers,
  createSnapshot,
  executeAirdrop,
  loadKeypairFromBase64,
  AMOUNT_PER_WALLET,
} from '@/lib/lister-airdrop'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 min for airdrop execution

async function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase not configured')
  return supabaseAdmin || createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : ''
    const action = body.action === 'execute' ? 'execute' : 'snapshot'
    const snapshotId = typeof body.snapshotId === 'string' ? body.snapshotId.trim() : null

    if (!wallet) {
      return NextResponse.json({ error: 'wallet required' }, { status: 400 })
    }

    const ok = await isAdmin(wallet)
    if (!ok) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = await getSupabaseAdmin()

    if (action === 'snapshot') {
      const listers = await getUniqueListers(supabase)
      if (listers.length === 0) {
        return NextResponse.json({
          ok: true,
          action: 'snapshot',
          snapshotId: null,
          recipients: 0,
          message: 'No listers found.',
        })
      }

      const id = await createSnapshot(supabase, listers)
      return NextResponse.json({
        ok: true,
        action: 'snapshot',
        snapshotId: id,
        recipients: listers.length,
        amountPerWallet: AMOUNT_PER_WALLET,
        message: `Snapshot created. ${listers.length} recipients. Run execute with snapshotId to send.`,
      })
    }

    // execute
    if (!snapshotId) {
      return NextResponse.json({ error: 'snapshotId required for execute' }, { status: 400 })
    }

    const { data: snap } = await supabase
      .from('lister_airdrop_snapshots')
      .select('id')
      .eq('id', snapshotId)
      .single()

    if (!snap) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    const payer = loadKeypairFromBase64()
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    const result = await executeAirdrop(connection, payer, supabase, snapshotId, {
      batchSize: 5,
      delayMs: 2000,
      limit: 50, // per request - can run multiple times for same snapshot
    })

    return NextResponse.json({
      ok: true,
      action: 'execute',
      snapshotId,
      sent: result.sent,
      failed: result.failed,
      signatures: result.signatures,
      message: `Sent ${result.sent}, failed ${result.failed}. Run again to continue pending.`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/lister-airdrop]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
