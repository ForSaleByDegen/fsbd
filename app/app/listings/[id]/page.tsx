import type { Metadata } from 'next'
import Header from '@/components/Header'
import ListingDetail from '@/components/ListingDetail'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getIPFSGatewayURL } from '@/lib/pinata'

export const dynamic = 'force-dynamic'

async function getListingForMetadata(id: string) {
  if (!supabaseAdmin) return null
  const { data } = await supabaseAdmin
    .from('listings')
    .select('id, title, description, price, price_token, token_symbol, images')
    .eq('id', id)
    .single()
  return data
}

function toAbsoluteImageUrl(img: string | null | undefined): string | null {
  if (!img || typeof img !== 'string') return null
  if (img.startsWith('http://') || img.startsWith('https://')) return img
  if (img.startsWith('Qm') || img.startsWith('baf')) return getIPFSGatewayURL(img)
  return getIPFSGatewayURL(img)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingForMetadata(id)
  if (!listing) {
    return { title: 'Listing | $FSBD' }
  }

  const firstImg = Array.isArray(listing.images) ? listing.images[0] : null
  const imageUrl = toAbsoluteImageUrl(firstImg)

  const tokenLabel = listing.price_token === 'LISTING_TOKEN' && listing.token_symbol
    ? listing.token_symbol
    : (listing.price_token || 'SOL')
  const title = `${listing.title} — ${listing.price} ${tokenLabel} | $FSBD`
  const description =
    typeof listing.description === 'string'
      ? listing.description.slice(0, 160)
      : 'For Sale By Degen — decentralized marketplace on Solana'

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl && { images: [{ url: imageUrl, alt: listing.title }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
  return metadata
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <Header />
      <main className="max-w-4xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 w-full relative z-10">
        <ListingDetail listingId={id} />
      </main>
    </div>
  )
}
