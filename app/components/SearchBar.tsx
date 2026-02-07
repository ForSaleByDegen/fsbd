'use client'

import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { getSubcategories } from '@/lib/categories'

export type ListedTimeFilter = 'any' | '24h' | '7d' | '30d' | 'older'
export type ListedSort = 'newest' | 'oldest'

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  category: string
  setCategory: (category: string) => void
  categories: string[]
  subcategory?: string
  setSubcategory?: (v: string) => void
  delivery?: string
  setDelivery?: (v: string) => void
  locationCity?: string
  setLocationCity?: (v: string) => void
  locationRegion?: string
  setLocationRegion?: (v: string) => void
  listedTime?: ListedTimeFilter
  setListedTime?: (v: ListedTimeFilter) => void
  listedSort?: ListedSort
  setListedSort?: (v: ListedSort) => void
}

export default function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  category, 
  setCategory, 
  categories,
  subcategory = '',
  setSubcategory,
  delivery = 'all',
  setDelivery,
  locationCity = '',
  setLocationCity,
  locationRegion = '',
  setLocationRegion,
  listedTime = 'any',
  setListedTime,
  listedSort = 'newest',
  setListedSort
}: SearchBarProps) {
  const showDelivery = setDelivery != null
  const showLocation = setLocationCity != null && setLocationRegion != null
  const showListedTime = setListedTime != null
  const showListedSort = setListedSort != null
  const subcategories = getSubcategories(category)
  const showSubcategory = setSubcategory != null && subcategories.length > 0 && category !== 'all'

  return (
    <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 bg-black/80 p-3 sm:p-4 border-2 sm:border-4 border-[#660099] pixel-art shadow-lg w-full">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative w-full">
          <Input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black border-2 border-[#660099] text-[#00ff00] font-pixel-alt placeholder:text-purple-readable focus:border-[#00ff00] focus:ring-2 focus:ring-[#00ff00] w-full min-h-[44px] text-base sm:text-sm"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-readable pointer-events-none">🔍</span>
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
        {showSubcategory && (
          <Select value={subcategory || 'all'} onValueChange={setSubcategory!}>
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-base sm:text-sm">
              <SelectValue placeholder="Subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="min-h-[44px]">All</SelectItem>
              {subcategories.map((s) => (
                <SelectItem key={s.value} value={s.value} className="min-h-[44px]">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
        {showListedTime && (
          <Select value={listedTime} onValueChange={(v) => setListedTime!(v as ListedTimeFilter)}>
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-base sm:text-sm">
              <SelectValue placeholder="Listed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any" className="min-h-[44px]">Any time</SelectItem>
              <SelectItem value="24h" className="min-h-[44px]">Last 24h</SelectItem>
              <SelectItem value="7d" className="min-h-[44px]">Last 7 days</SelectItem>
              <SelectItem value="30d" className="min-h-[44px]">Last 30 days</SelectItem>
              <SelectItem value="older" className="min-h-[44px]">Older than 30d</SelectItem>
            </SelectContent>
          </Select>
        )}
        {showListedSort && (
          <Select value={listedSort} onValueChange={(v) => setListedSort!(v as ListedSort)}>
            <SelectTrigger className="w-full sm:w-[140px] min-h-[44px] text-base sm:text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="min-h-[44px]">Newest first</SelectItem>
              <SelectItem value="oldest" className="min-h-[44px]">Oldest first</SelectItem>
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
