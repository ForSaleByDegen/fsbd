import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'For Sale By Degen',
    short_name: '$FSBD',
    description: 'Degen Craigslist: Crypto payments, token-gated listings, and mini-launches on Solana. Anon side project.',
    start_url: '/',
    display: 'browser',
    background_color: '#000000',
    theme_color: '#660099',
    orientation: 'portrait-primary',
    categories: ['marketplace', 'finance', 'utilities'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/maskable-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/maskable-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Create Listing',
        short_name: 'Create',
        description: 'Create a new listing',
        url: '/listings/create',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'My Listings',
        short_name: 'Mine',
        description: 'View your listings',
        url: '/listings/my',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Claim Creator Fees',
        short_name: 'Claim',
        description: 'Claim pump.fun creator fees',
        url: '/claim-fees',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  }
}
