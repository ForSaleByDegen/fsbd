/**
 * Suppress known Phantom/wallet-adapter console warnings that we can't fix in code.
 * Runs once on client init. Filters messages from @solana/wallet-adapter and Phantom extension.
 */
const FILTER_PATTERNS = [
  /StandardWalletAdapter|wallet.*adapter.*deprecated/i,
  /phantom.*injected|Phantom.*provider/i,
  /blowfish|simulation.*warning/i,
  /wallet-adapter.*warn/i,
]

export function initSuppressWalletWarnings() {
  if (typeof window === 'undefined') return
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ')
    if (FILTER_PATTERNS.some((p) => p.test(msg))) return
    origWarn.apply(console, args)
  }
}
