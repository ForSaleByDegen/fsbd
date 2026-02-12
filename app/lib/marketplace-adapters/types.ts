export type ExternalSyncedListing = {
  external_listing_id: string
  external_url: string | null
  title: string
  description: string | null
  price_json: { value?: number; currency?: string; formatted?: string }
  images: string[]
  category: string | null
  status: string
}
