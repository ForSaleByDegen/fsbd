'use client'

import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  category: string
  setCategory: (category: string) => void
  categories: string[]
  delivery?: string
  setDelivery?: (v: string) => void
  locationCity?: string
  setLocationCity?: (v: string) => void
  locationRegion?: string
  setLocationRegion?: (v: string) => void
}

export default function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  category, 
  setCategory, 
  categories,
  delivery = 'all',
  setDelivery,
  locationCity = '',
  setLocationCity,
  locationRegion = '',
  setLocationRegion
}: SearchBarProps) {
  const showDelivery = setDelivery != null
  const showLocation = setLocationCity != null && setLocationRegion != null

  return (
    <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 bg-black/80 p-3 sm:p-4 border-2 sm:border-4 border-[#660099] pixel-art shadow-lg w-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative w-full">
          <Input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt placeholder:text-[#660099] focus:border-[#00ff00] focus:ring-2 focus:ring-[#00ff00] w-full min-h-[44px] text-base sm:text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#660099] pointer-events-none">🔍</span>
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px] min-h-[44px] text-base sm:text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat} className="min-h-[44px]">
                {cat === 'all' ? 'All' : cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showDelivery && (
          <Select value={delivery} onValueChange={setDelivery!}>
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-base sm:text-sm">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="min-h-[44px]">All</SelectItem>
              <SelectItem value="local_pickup" className="min-h-[44px]">Local pickup</SelectItem>
              <SelectItem value="ship" className="min-h-[44px]">Ships</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
      {showLocation && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            type="text"
            placeholder="City (e.g. Austin)"
            value={locationCity}
            onChange={(e) => setLocationCity(e.target.value)}
            className="sm:w-[140px] min-h-[44px] text-base sm:text-sm bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt"
          />
          <Input
            type="text"
            placeholder="State (e.g. TX)"
            value={locationRegion}
            onChange={(e) => setLocationRegion(e.target.value)}
            className="sm:w-[100px] min-h-[44px] text-base sm:text-sm bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt"
          />
        </div>
      )}
    </div>
  )
}
