/**
 * Web Worker for vanity address grinding.
 * Runs in a background thread so it doesn't block the UI.
 * Receives { suffix: string, reportInterval?: number }.
 * Posts { type: 'progress', attempts } every reportInterval attempts.
 * Posts { publicKey, secretKey } when done.
 */
import { Keypair } from '@solana/web3.js'

self.onmessage = (e: MessageEvent<{ suffix: string; reportInterval?: number }>) => {
  const suffix = (e.data?.suffix || 'pump').toLowerCase()
  const reportInterval = e.data?.reportInterval ?? 0
  for (let i = 0; i < 1e9; i++) {
    const kp = Keypair.generate()
    const addr = kp.publicKey.toBase58()
    if (addr.toLowerCase().endsWith(suffix)) {
      self.postMessage({ publicKey: addr, secretKey: Array.from(kp.secretKey) })
      break
    }
    if (reportInterval > 0 && (i + 1) % reportInterval === 0) {
      self.postMessage({ type: 'progress', attempts: i + 1 })
    }
  }
}
