'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getUserTier, calculateListingFee } from '@/lib/tier-check'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { incrementListingCount, addToTotalFees, upsertUserProfile } from '@/lib/admin'
import { uploadMultipleImagesToIPFS } from '@/lib/pinata'
import { createPumpFunToken, createListingToken } from '@/lib/token-ops'
import { sendTransactionWithRebate, shouldUseRebate } from '@/lib/helius-rebate'
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
import { CATEGORIES, getSubcategories } from '@/lib/categories'

export default function CreateListingForm() {
  const { publicKey, signTransaction, signMessage } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'for-sale',
    price: '',
    priceToken: 'SOL',
    quantity: 1,
    images: [] as File[],
    launchToken: false,
    tokenName: '',
    tokenSymbol: '',
    devBuySol: 0.01,
    deliveryMethod: 'ship' as 'ship' | 'local_pickup' | 'both',
    locationCity: '',
    locationRegion: '',
    externalListingUrl: '',
    subcategory: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !connection) {
      alert('Please connect your wallet')
      return
    }
    
    // Check if signMessage is available (required for non-token listings)
    if (!formData.launchToken && !signMessage) {
      alert('Your wallet does not support message signing. Please use a compatible wallet or enable token launch.')
      return
    }
    
    // Check if signTransaction is available (required for token launches)
    if (formData.launchToken && !signTransaction) {
      alert('Please connect your wallet to launch a token')
      return
    }

    try {
      setLoading(true)
      
      // Upload images to IPFS via Pinata
      const imageUrls: string[] = []
      if (formData.images && formData.images.length > 0) {
        try {
          const urls = await uploadMultipleImagesToIPFS(formData.images)
          // Store full URLs directly (more reliable than extracting CIDs)
          imageUrls.push(...urls)
          console.log('Uploaded images:', urls)
        } catch (error: any) {
          console.error('IPFS upload error:', error)
          throw new Error('Failed to upload images to IPFS: ' + (error.message || 'Please check your Pinata JWT'))
        }
      }

      // Launch token if requested (pump.fun with dev buy, fallback to SPL)
      let tokenMint: string | null = null
      let fee = 0
      if (formData.launchToken && formData.tokenName && formData.tokenSymbol) {
        const imageFile = formData.images?.[0]
        const imageUrl = imageUrls?.[0]
        if (!imageFile && !imageUrl) {
          throw new Error('Token launch on pump.fun requires at least one image. Add an image to your listing.')
        }

        const tier = await getUserTier(publicKey.toString(), connection)
        fee = calculateListingFee(tier)
        const devBuy = Math.max(0.001, formData.devBuySol ?? 0.01)

        try {
          tokenMint = await createPumpFunToken(
            publicKey,
            signTransaction!,
            connection,
            formData.tokenName,
            formData.tokenSymbol,
            {
              devBuySol: devBuy,
              imageFile: imageFile || undefined,
              imageUrl: imageUrl || undefined,
              description: formData.description?.slice(0, 500),
            }
          )
        } catch (pumpErr: unknown) {
          const msg = pumpErr instanceof Error ? pumpErr.message : String(pumpErr)
          if (/image|IPFS|pump/i.test(msg)) {
            throw pumpErr
          }
          // Fallback to simple SPL token
          tokenMint = await createListingToken(
            publicKey,
            signTransaction!,
            connection,
            formData.tokenName,
            formData.tokenSymbol
          )
        }

        // Pay listing fee only when launching token
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

        // Get recent blockhash and set fee payer (required for transaction)
        const { blockhash } = await connection.getLatestBlockhash('finalized')
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey

        // Sign and send payment (with Helius rebate when available, fallback on fetch failure)
        const signed = await signTransaction!(transaction)
        const serialized = signed.serialize()
        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL
        let signature: string
        if (shouldUseRebate() && rpcUrl) {
          try {
            signature = await sendTransactionWithRebate(serialized, publicKey.toString(), rpcUrl, { maxRetries: 3 })
          } catch (rebateErr: unknown) {
            const msg = rebateErr instanceof Error ? rebateErr.message : String(rebateErr)
            if (/failed to fetch|ERR_CONNECTION|network|fetch/i.test(msg)) {
              console.warn('Helius rebate failed, using standard RPC:', msg)
              signature = await connection.sendRawTransaction(serialized)
            } else {
              throw rebateErr
            }
          }
        } else {
          signature = await connection.sendRawTransaction(serialized)
        }
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
      } else {
        // For regular listings (no token), just sign a message of intent
        if (!signMessage) {
          throw new Error('Wallet signMessage is not available. Please use a compatible wallet.')
        }

        // Create message of intent
        const message = new TextEncoder().encode(
          `I intend to create a listing on $FSBD Marketplace:\n\n` +
          `Title: ${formData.title}\n` +
          `Category: ${formData.category}\n` +
          `Price: ${formData.price} ${formData.priceToken}\n` +
          `Timestamp: ${Date.now()}\n\n` +
          `By signing this message, I confirm my intent to list this item.`
        )

        // Sign message
        const signature = await signMessage(message)
        console.log('Message signed:', signature)

        // Update user profile stats (no fee paid)
        try {
          const tier = await getUserTier(publicKey.toString(), connection)
          await upsertUserProfile(publicKey.toString(), { tier })
          await incrementListingCount(publicKey.toString())
        } catch (error) {
          console.error('Error updating user profile:', error)
          // Don't fail the listing creation if profile update fails
        }
      }

      // Create listing in database
      const listingData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        price_token: formData.priceToken,
        quantity: Math.max(1, Math.floor(Number(formData.quantity) || 1)),
        images: imageUrls, // Store full URLs
        wallet_address_hash: hashWalletAddress(publicKey.toString()),
        wallet_address: publicKey.toString(), // Encrypted in DB
        has_token: !!tokenMint,
        token_mint: tokenMint,
        token_name: formData.tokenName || null,
        token_symbol: formData.tokenSymbol || null,
        fee_paid: fee, // 0 for regular listings, fee amount for token launches
        status: 'active',
        delivery_method: formData.deliveryMethod,
        location_city: formData.locationCity.trim() || null,
        location_region: formData.locationRegion.trim() || null,
        external_listing_url: formData.externalListingUrl.trim() || null,
        subcategory: formData.subcategory.trim() || null
      }
      
      console.log('Creating listing with images:', imageUrls)

      // Always use API route - validates wallet_address server-side and uses service role for reliable insert
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create listing`)
      }

      const data = await response.json()
      if (!data || !data.id) {
        throw new Error('Listing created but no ID returned')
      }

      console.log('Listing created successfully:', data.id)

      alert(`Listing created successfully! Redirecting to your listing...`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push(`/listings/${data.id}`)
    } catch (error: any) {
      console.error('Error creating listing:', error)
      const errorMessage = error?.message || 'Unknown error'
      console.error('Full error details:', error)
      alert('Failed to create listing: ' + errorMessage)
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
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value, subcategory: '' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {getSubcategories(formData.category).length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2">Subcategory (optional)</label>
            <Select
              value={formData.subcategory || 'none'}
              onValueChange={(v) => setFormData(prev => ({ ...prev, subcategory: v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {getSubcategories(formData.category).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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

        <div>
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <Input
            type="number"
            min={1}
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
          />
          <p className="text-xs text-muted-foreground mt-1">How many of this item are you selling? (Default: 1)</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Delivery / Meetup</label>
        <Select
          value={formData.deliveryMethod}
          onValueChange={(v: 'ship' | 'local_pickup' | 'both') => setFormData(prev => ({ ...prev, deliveryMethod: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ship">Ship only</SelectItem>
            <SelectItem value="local_pickup">Local pickup / meet in person only</SelectItem>
            <SelectItem value="both">Both (ship or local pickup)</SelectItem>
          </SelectContent>
        </Select>
        {(formData.deliveryMethod === 'local_pickup' || formData.deliveryMethod === 'both') && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Input
              placeholder="City (e.g. Austin)"
              value={formData.locationCity}
              onChange={(e) => setFormData(prev => ({ ...prev, locationCity: e.target.value }))}
            />
            <Input
              placeholder="State/Region (e.g. TX)"
              value={formData.locationRegion}
              onChange={(e) => setFormData(prev => ({ ...prev, locationRegion: e.target.value }))}
            />
            <p className="text-sm text-[#aa77ee] font-pixel-alt col-span-2">
              Approximate area only. Exact meetup details via chat. We don&apos;t store exact addresses.
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Also listed elsewhere? (optional)</label>
        <Input
          type="url"
          placeholder="https://..."
          value={formData.externalListingUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, externalListingUrl: e.target.value }))}
        />
        <p className="text-sm text-[#aa77ee] font-pixel-alt mt-1">Link to the same item on another platform — helps buyers find you.</p>
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
              alert(`Some files are too large (max 1GB). Please select smaller images.`)
              return
            }
            // Store original files without any compression or modification
            // Files are uploaded as-is to preserve original quality
            setFormData(prev => ({ ...prev, images: files }))
          }}
        />
        <p className="text-sm text-[#aa77ee] font-pixel-alt mt-1">
          Images will be uploaded to IPFS via Pinata in original quality (no compression) - max 1GB per file
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
          <div className="grid grid-cols-2 gap-4 ml-6 space-y-2">
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
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Dev buy (SOL) — initial buy on pump.fun</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formData.devBuySol}
                onChange={(e) => setFormData(prev => ({ ...prev, devBuySol: Math.max(0, parseFloat(e.target.value) || 0) }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Uses first listing image. Add an image above for pump.fun.</p>
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
