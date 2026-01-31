'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getUserTier, calculateListingFee } from '@/lib/tier-check'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { incrementListingCount, addToTotalFees, upsertUserProfile } from '@/lib/admin'
import { uploadMultipleImagesToIPFS } from '@/lib/pinata'
import { createListingToken } from '@/lib/token-ops'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export default function CreateListingForm() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'for-sale',
    price: '',
    priceToken: 'SOL',
    images: [] as File[],
    launchToken: false,
    tokenName: '',
    tokenSymbol: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !connection) {
      alert('Please connect your wallet')
      return
    }

    try {
      setLoading(true)
      
      // Get user tier and calculate fee
      const tier = await getUserTier(publicKey.toString(), connection)
      const fee = calculateListingFee(tier)
      
      // Upload images to IPFS via Pinata
      const imageHashes: string[] = []
      if (formData.images && formData.images.length > 0) {
        try {
          const urls = await uploadMultipleImagesToIPFS(formData.images)
          // Extract CID from URLs (format: https://gateway.pinata.cloud/ipfs/{cid} or https://ipfs.io/ipfs/{cid})
          imageHashes.push(...urls.map(url => {
            // Extract CID from various URL formats
            const match = url.match(/ipfs\/([^/?]+)/)
            if (match) return match[1]
            // If it's already a CID, return as-is
            if (url.length === 46 && url.startsWith('Qm')) return url
            if (url.length === 59 && url.startsWith('baf')) return url
            return url
          }))
        } catch (error: any) {
          console.error('IPFS upload error:', error)
          throw new Error('Failed to upload images to IPFS: ' + (error.message || 'Please check your Pinata JWT'))
        }
      }

      // Launch token if requested
      let tokenMint: string | null = null
      if (formData.launchToken && formData.tokenName && formData.tokenSymbol) {
        tokenMint = await createListingToken(
          publicKey,
          signTransaction!,
          connection,
          formData.tokenName,
          formData.tokenSymbol
        )
      }

      // Create payment transaction
      const appWallet = new PublicKey(
        process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
      )
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: appWallet,
          lamports: fee * LAMPORTS_PER_SOL,
        })
      )

      // Sign and send payment
      const signed = await signTransaction!(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize())
      await connection.confirmTransaction(signature)

      // Update user profile stats
      try {
        await upsertUserProfile(publicKey.toString(), { tier })
        await incrementListingCount(publicKey.toString())
        await addToTotalFees(publicKey.toString(), fee)
      } catch (error) {
        console.error('Error updating user profile:', error)
        // Don't fail the listing creation if profile update fails
      }

      // Create listing in database
      const listingData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        price_token: formData.priceToken,
        images: imageHashes,
        wallet_address_hash: hashWalletAddress(publicKey.toString()),
        wallet_address: publicKey.toString(), // Encrypted in DB
        has_token: !!tokenMint,
        token_mint: tokenMint,
        token_name: formData.tokenName || null,
        token_symbol: formData.tokenSymbol || null,
        fee_paid: fee,
        status: 'active'
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('listings')
          .insert([listingData])
          .select()
          .single()

        if (error) throw error
        router.push(`/listings/${data.id}`)
      } else {
        // Fallback to API route
        const response = await fetch('/api/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listingData)
        })
        const data = await response.json()
        router.push(`/listings/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error creating listing:', error)
      alert('Failed to create listing: ' + (error.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full max-w-full relative z-10">
      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          maxLength={200}
          className="min-h-[44px] text-base sm:text-sm w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description *</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
          rows={6}
          maxLength={5000}
          className="min-h-[120px] text-base sm:text-sm w-full resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category *</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="for-sale">For Sale</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="gigs">Gigs</SelectItem>
              <SelectItem value="housing">Housing</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="jobs">Jobs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Price *</label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              required
            />
            <Select
              value={formData.priceToken}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priceToken: value }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">SOL</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Images (IPFS)</label>
        <Input
          type="file"
          multiple
          accept="image/*"
          className="min-h-[44px] text-base sm:text-sm w-full"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            // Validate file sizes
            const maxSize = 1024 * 1024 * 1024 // 1GB (Pinata free tier limit)
            const invalidFiles = files.filter(f => f.size > maxSize)
            if (invalidFiles.length > 0) {
              alert(`Some files are too large (max 100MB). Please select smaller images.`)
              return
            }
            setFormData(prev => ({ ...prev, images: files }))
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Images will be uploaded to IPFS via Pinata (max 1GB per file)
        </p>
        {formData.images.length > 0 && (
          <p className="text-xs text-[#00ff00] mt-1">
            {formData.images.length} file(s) selected
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={formData.launchToken}
            onChange={(e) => setFormData(prev => ({ ...prev, launchToken: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Launch a token for this listing (fun/marketing only)</span>
        </label>

        {formData.launchToken && (
          <div className="grid grid-cols-2 gap-4 ml-6">
            <div>
              <label className="block text-sm font-medium mb-2">Token Name</label>
              <Input
                type="text"
                value={formData.tokenName}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Token Symbol</label>
              <Input
                type="text"
                value={formData.tokenSymbol}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenSymbol: e.target.value }))}
                maxLength={10}
              />
            </div>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full min-h-[44px] text-base sm:text-sm touch-manipulation"
      >
        {loading ? 'Creating...' : 'Create Listing (Pay Fee)'}
      </Button>
    </form>
  )
}
