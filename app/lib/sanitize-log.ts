/**
 * Sanitize sensitive data before logging.
 * Never log full wallet addresses, private keys, or API keys.
 */
export function maskWallet(addr: string | null | undefined): string {
  if (!addr || typeof addr !== 'string') return '[invalid]'
  const s = String(addr).trim()
  if (s.length < 12) return '***'
  return `${s.slice(0, 4)}...${s.slice(-4)}`
}
