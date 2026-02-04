/**
 * Web Worker for vanity address grinding.
 * Runs in a background thread so it doesn't block the UI.
 * Receives { suffix: string } and posts { publicKey, secretKey } when done.
 */
import { Keypair } from '@solana/web3.js'

self.onmessage = (e: MessageEvent<{ suffix: string }>) => {
  const suffix = (e.data?.suffix || 'pump').toLowerCase()
  for (let i = 0; i < 1e9; i++) {
    const kp = Keypair.generate()
    const addr = kp.publicKey.toBase58()
    if (addr.toLowerCase().endsWith(suffix)) {
      self.postMessage({
        publicKey: addr,
        secretKey: Array.from(kp.secretKey),
      })
      break
    }
  }
}
