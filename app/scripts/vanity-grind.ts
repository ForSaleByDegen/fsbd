/**
 * CLI vanity address generator — much faster than the browser.
 * Uses solana-keygen when available (10-100x faster) or worker threads as fallback.
 *
 * Run: npm run vanity [suffix] [-- --background] [-- --output file.json]
 * Examples:
 *   npm run vanity pump
 *   npm run vanity pump -- --background
 *   npm run vanity pump -- --output my-key.json
 */
import { Worker } from 'worker_threads'
import { spawn } from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

const args = process.argv.slice(2)
const suffixArg = args.find((a) => !a.startsWith('--'))
const suffix = (suffixArg || 'pump').trim().toLowerCase()
const background = args.includes('--background')
const outputIdx = args.indexOf('--output')
const outputFile = outputIdx >= 0 && args[outputIdx + 1] ? args[outputIdx + 1] : null

if (!suffix || suffix.length > 8) {
  console.error('Usage: npm run vanity [suffix] [-- --background] [-- --output file.json]')
  console.error('Suffix must be 1-8 characters (default: pump)')
  process.exit(1)
}

const resultPath = outputFile || (background ? path.join(process.cwd(), 'vanity-result.json') : null)

function writeResult(result: { publicKey: string; secretKey: string; attempts?: number; source: string }) {
  if (resultPath) {
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`\nResult written to ${resultPath}`)
  }
}

function done(result: { publicKey: string; secretKey: string; attempts?: number; source: string }) {
  console.log('\n✓ Found!\n')
  console.log('Public Key:')
  console.log(result.publicKey)
  console.log('\nSecret Key (JSON — import into Phantom/Solflare):')
  console.log(result.secretKey)
  console.log('\n⚠️  Save your secret key securely. Never share it.')
  writeResult(result)
}

function runInBackground() {
  const childArgs = ['tsx', path.join(__dirname, 'vanity-grind.ts'), suffix]
  if (resultPath) childArgs.push('--output', resultPath)
  const child = spawn('npx', childArgs, {
    detached: true,
    stdio: 'ignore',
    cwd: path.join(__dirname, '..'),
    shell: true,
  })
  child.unref()
  console.log(`Grinding for "${suffix}" in background. Result will be written to ${resultPath}`)
  console.log('Run with no --background to see live output.')
  process.exit(0)
}

if (background) {
  runInBackground()
}

async function trySolanaKeygen(): Promise<boolean> {
  const tmpFile = path.join(os.tmpdir(), `vanity-${suffix}-${Date.now()}.json`)
  return new Promise((resolve) => {
    const proc = spawn('solana-keygen', ['grind', '--ends-with', `${suffix}:1`, '-o', tmpFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    proc.stderr?.on('data', (d) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(tmpFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(tmpFile, 'utf-8')) as number[]
          const { Keypair } = require('@solana/web3.js')
          const kp = Keypair.fromSecretKey(Uint8Array.from(data))
          const addr = kp.publicKey.toBase58()
          fs.unlinkSync(tmpFile)
          done({
            publicKey: addr,
            secretKey: JSON.stringify(Array.from(kp.secretKey)),
            source: 'solana-keygen',
          })
          resolve(true)
        } catch {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
          resolve(false)
        }
      } else {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
        resolve(false)
      }
    })
    proc.on('error', () => resolve(false))
  })
}

async function main() {
  console.log(`Grinding for address ending in "${suffix}"...`)

  const used = await trySolanaKeygen()
  if (used) return

  console.log('Solana CLI not found or failed — using Node.js workers.\n')

  const numWorkers = os.cpus().length
  const workerPath = path.join(__dirname, 'vanity-worker.mjs')
  const start = Date.now()
  let resolved = false

  function workerDone(msg: { publicKey: string; secretKey: string; attempts: number }) {
    if (resolved) return
    resolved = true
    workers.forEach((w) => w.terminate())
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`Found after ${msg.attempts.toLocaleString()} attempts in ${elapsed}s`)
    done({
      publicKey: msg.publicKey,
      secretKey: msg.secretKey,
      attempts: msg.attempts,
      source: 'node-workers',
    })
  }

  const workers: Worker[] = []
  for (let i = 0; i < numWorkers; i++) {
    const w = new Worker(workerPath, {
      workerData: { suffix },
      execArgv: ['--no-warnings'],
    })
    workers.push(w)
    w.on('message', workerDone)
    w.on('error', (err) => {
      if (!resolved) {
        resolved = true
        workers.forEach((x) => x.terminate())
        console.error('Worker error:', err)
        process.exit(1)
      }
    })
  }
}

main()
