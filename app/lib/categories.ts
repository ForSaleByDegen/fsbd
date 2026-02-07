/**
 * Categories and subcategories - expand as marketplace grows.
 * Add new subcategories here; they will appear in filters and create form.
 */
export const CATEGORIES = [
  { value: 'for-sale', label: 'For Sale' },
  { value: 'digital-assets', label: 'Digital Assets' },
  { value: 'services', label: 'Services' },
  { value: 'gigs', label: 'Gigs' },
  { value: 'housing', label: 'Housing' },
  { value: 'community', label: 'Community' },
  { value: 'jobs', label: 'Jobs' },
] as const

/** Subcategories per category - add more over time */
export const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  'digital-assets': [
    { value: 'nft', label: 'NFT' },
    { value: 'token', label: 'Token (existing token)' },
    { value: 'whole_token', label: 'Whole Token (project sale)' },
    { value: 'token_rights', label: 'Token Rights (sell creator fee rights)' },
    { value: 'meme_coin', label: 'Meme Coin (large % holder)' },
    { value: 'wallet', label: 'Wallet (sell a wallet)' },
  ],
  'for-sale': [
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'collectibles', label: 'Collectibles' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'sports', label: 'Sports' },
    { value: 'books', label: 'Books & Media' },
    { value: 'other', label: 'Other' },
  ],
  services: [
    { value: 'repair', label: 'Repair' },
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'design', label: 'Design' },
    { value: 'other', label: 'Other' },
  ],
  gigs: [
    { value: 'creative', label: 'Creative' },
    { value: 'tech', label: 'Tech' },
    { value: 'writing', label: 'Writing' },
    { value: 'other', label: 'Other' },
  ],
  housing: [
    { value: 'apts', label: 'Apartments' },
    { value: 'rooms', label: 'Rooms' },
    { value: 'sublets', label: 'Sublets' },
    { value: 'other', label: 'Other' },
  ],
  community: [
    { value: 'events', label: 'Events' },
    { value: 'activities', label: 'Activities' },
    { value: 'other', label: 'Other' },
  ],
  jobs: [
    { value: 'fulltime', label: 'Full-time' },
    { value: 'parttime', label: 'Part-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'other', label: 'Other' },
  ],
} as const

export function getSubcategories(category: string): { value: string; label: string }[] {
  return SUBCATEGORIES[category] || []
}

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value.replace('-', ' ')
}

export function getSubcategoryLabel(category: string, subcategory: string): string {
  const subs = getSubcategories(category)
  return subs.find((s) => s.value === subcategory)?.label ?? subcategory
}
