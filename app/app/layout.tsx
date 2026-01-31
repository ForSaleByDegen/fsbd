import type { Metadata } from 'next'
import { Press_Start_2P, VT323 } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'
import WalletProvider from '@/components/providers/WalletProvider'
import WalletErrorHandler from '@/components/WalletErrorHandler'
import BackDoorModal from '@/components/BackDoorModal'
import EasterEgg from '@/components/EasterEgg'
import MatrixRain from '@/components/MatrixRain'
import FloatingCryptoIcons from '@/components/FloatingCryptoIcons'

// Dynamically import PrivyProvider to avoid build-time errors
const PrivyProvider = dynamic(
  () => import('@/components/providers/PrivyProvider'),
  { ssr: false }
)

const pressStart2P = Press_Start_2P({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

const vt323 = VT323({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel-alt',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'For Sale By Degen',
  description: 'Degen Craigslist: Crypto payments, token-gated listings, and mini-launches on Solana. Anon side project.',
  manifest: '/manifest.json',
  themeColor: '#660099',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '$FSBD',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', rel: 'icon', type: 'image/x-icon' },
      { url: '/icon-192.png', rel: 'icon', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', rel: 'icon', sizes: '512x512', type: 'image/png' },
      { url: '/icon1.png', rel: 'icon', sizes: '180x180', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  // No tracking, no analytics
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#660099" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="$FSBD" />
      </head>
      <body className={`${pressStart2P.variable} ${vt323.variable} bg-background text-foreground pixel-art`}>
        <PrivyProvider>
          <WalletProvider>
            <WalletErrorHandler />
            <div className="crt-screen">
              <MatrixRain />
              <FloatingCryptoIcons />
              <BackDoorModal />
              <EasterEgg />
              {children}
            </div>
          </WalletProvider>
        </PrivyProvider>
      </body>
    </html>
  )
}
