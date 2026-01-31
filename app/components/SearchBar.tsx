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
}

export default function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  category, 
  setCategory, 
  categories 
}: SearchBarProps) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-black/80 p-3 sm:p-4 border-2 sm:border-4 border-[#660099] pixel-art shadow-lg w-full">
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
        <SelectTrigger className="w-full sm:w-[200px] min-h-[44px] text-base sm:text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat} className="min-h-[44px]">
              {cat === 'all' ? 'All Categories' : cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
