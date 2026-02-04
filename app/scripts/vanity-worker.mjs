/**
 * Worker for vanity-grind CLI. Runs in a separate thread for parallel keypair generation.
 * Uses .mjs for clean ESM worker (worker_threads works with ESM).
 */
import { parentPort, workerData } from 'worker_threads'
import { Keypair } from '@solana/web3.js'

const target = (workerData.suffix || 'pump').toLowerCase()

for (let i = 0; i < 1e9; i++) {
  const kp = Keypair.generate()
  const addr = kp.publicKey.toBase58()
  if (addr.toLowerCase().endsWith(target)) {
    parentPort?.postMessage({
      publicKey: addr,
      secretKey: JSON.stringify(Array.from(kp.secretKey)),
      attempts: i + 1,
    })
    break
  }
}
