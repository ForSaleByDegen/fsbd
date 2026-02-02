import Link from 'next/link'
import { getIPFSGatewayURL } from '@/lib/pinata'
import { getSubcategoryLabel } from '@/lib/categories'
import { formatRelativeTime } from '@/lib/format-time'

interface ListingCardProps {
  listing: {
    id: string
    title: string
    description?: string
    price: number
    price_token: string
    category: string
    subcategory?: string
    images?: string[]
    has_token?: boolean
    status?: string
    quantity?: number
    delivery_method?: string
    location_city?: string
    location_region?: string
    created_at?: string
    updated_at?: string
  }
}

export default function ListingCard({ listing }: ListingCardProps) {
  const formatPrice = () => {
    return `${listing.price} ${listing.price_token || 'SOL'}`
  }

  // Get image URL - handle both full URLs and CIDs
  const getImageUrl = (image: string | null | undefined): string | null => {
    if (!image) return null
    
    // If it's already a full URL, return as-is
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image
    }
    
    // If it's a CID (Qm... or bafy...), convert to IPFS gateway URL
    if (image.startsWith('Qm') || image.startsWith('baf')) {
      return getIPFSGatewayURL(image)
    }
    
    // Try to convert to gateway URL anyway (backward compatibility)
    return getIPFSGatewayURL(image)
  }

  const imageUrl = listing.images && listing.images.length > 0
    ? getImageUrl(listing.images[0])
    : null

  return (
    <Link href={`/listings/${listing.id}`} className="block w-full">
      <div className="bg-black/80 border-2 sm:border-4 border-[#660099] p-3 sm:p-4 hover:border-[#00ff00] hover:shadow-[0_0_20px_rgba(0,255,0,0.5)] transition-all cursor-pointer h-full flex flex-col pixel-art min-h-[200px]">
        {imageUrl ? (
          <div className="w-full h-32 sm:h-40 md:h-48 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 overflow-hidden relative">
            <img 
              src={imageUrl} 
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('Image load error in ListingCard:', {
                  url: imageUrl,
                  listingId: listing.id,
                  title: listing.title
                })
                const target = e.currentTarget
                target.style.display = 'none'
                // Show error placeholder
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><span class="text-[#660099] text-xs">Image failed to load</span></div>'
                }
              }}
              onLoad={() => {
              }}
            />
          </div>
        ) : (
          <div className="w-full h-32 sm:h-40 md:h-48 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 flex items-center justify-center">
            <span className="text-[#660099] text-xs">No image</span>
          </div>
        )}
        <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2 break-words">{listing.title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2 flex-grow break-words">
          {listing.description}
        </p>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 mt-auto">
          <span className="text-primary font-bold text-sm sm:text-base">{formatPrice()}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {listing.subcategory
              ? getSubcategoryLabel(listing.category, listing.subcategory)
              : listing.category?.replace('-', ' ')}
            {(listing.location_city || listing.location_region) && (
              <> · {[listing.location_city, listing.location_region].filter(Boolean).join(', ')}</>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {listing.status === 'active' && listing.created_at && (
            <span className="inline-block text-xs text-muted-foreground" title={`Listed ${listing.created_at}`}>
              Listed {formatRelativeTime(listing.created_at)}
            </span>
          )}
          {listing.has_token && (
            <span className="inline-block text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
              🪙 Has Token
            </span>
          )}
          {listing.quantity != null && listing.quantity > 1 && (
            <span className="inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded">
              ×{listing.quantity} available
            </span>
          )}
          {listing.status === 'sold' && (
            <span className="inline-block text-xs bg-amber-600 text-amber-100 px-2 py-1 rounded">
              {listing.updated_at ? `Sold ${formatRelativeTime(listing.updated_at)}` : 'Sold'}
            </span>
          )}
          {listing.status && listing.status !== 'active' && listing.status !== 'sold' && (
            <span className="inline-block text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded capitalize">
              {listing.status}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
