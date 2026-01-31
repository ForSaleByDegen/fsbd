/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disabled for anonymous mode - no analytics, no tracking
  // analyticsId: undefined,
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  },
  webpack: (config, { isServer }) => {
    // Suppress pino-pretty warning (optional dev dependency)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    }
    return config
  },
}

module.exports = nextConfig
