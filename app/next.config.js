const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB - avoid hang on large chunks
  runtimeCaching: [
    {
      urlPattern: /\.(?:mp3|ogg|wav|m4a)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
        rangeRequests: true,
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|png|gif|webp|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 90,
          purgeOnQuotaError: true,
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: ({ url }) => url.origin.includes('ipfs.io') || url.origin.includes('nft.storage'),
      handler: 'CacheFirst',
      options: {
        cacheName: 'ipfs-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
  fallbacks: {
    audio: '/fallback-audio.mp3',
    image: '/fallback-placeholder.png',
  },
})

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
    
    // Fix for Privy/lucide-react barrel optimization issue
    config.resolve.alias = {
      ...config.resolve.alias,
      'lucide-react': require.resolve('lucide-react'),
    }
    
    // Disable barrel optimization for lucide-react to fix Privy import
    config.optimization = {
      ...config.optimization,
      usedExports: true,
    }
    
    return config
  },
}

module.exports = withPWA(nextConfig)
