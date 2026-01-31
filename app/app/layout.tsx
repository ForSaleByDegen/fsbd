import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import WalletProvider from '@/components/providers/WalletProvider'
import BackDoorModal from '@/components/BackDoorModal'
import EasterEgg from '@/components/EasterEgg'
import MatrixRain from '@/components/MatrixRain'

const inter = Inter({ subsets: ['latin'] })

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
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '$FBSD',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', rel: 'icon', type: 'image/x-icon' },
      { url: '/icon-192.png', rel: 'icon', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', rel: 'icon', sizes: '512x512', type: 'image/png' },
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="$FBSD" />
      </head>
      <body className={`${inter.className} bg-background text-foreground`}>
        <WalletProvider>
          <MatrixRain />
          <BackDoorModal />
          <EasterEgg />
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
