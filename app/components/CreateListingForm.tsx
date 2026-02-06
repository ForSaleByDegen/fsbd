'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { calculateListingFee, getMaxImagesForTier, canAddSocialsForTier } from '@/lib/tier-check'
import { supabase, hashWalletAddress } from '@/lib/supabase'
import { incrementListingCount, addToTotalFees, upsertUserProfile } from '@/lib/admin'
import { uploadMultipleImagesToIPFS } from '@/lib/pinata'
import { stripImageMetadataBatch } from '@/lib/strip-image-metadata'
import { createPumpFunToken, createListingToken } from '@/lib/token-ops'
import { formatPriceToken } from '@/lib/utils'
import { validateIconImage } from '@/lib/image-validation'
import { useVanityGrind } from '@/lib/useVanityGrind'
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
import { CATEGORIES, getSubcategories, getSubcategoryLabel } from '@/lib/categories'
import BuyListingSlotButton from './BuyListingSlotButton'
import TokenPreviewCard from './TokenPreviewCard'
import { useTier } from './providers/TierProvider'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

/** Build formatted token description for pump.fun/DEX — newlines create line breaks.
 * Does NOT include token name or listing title — pump.fun shows the name separately. */
function buildTokenDescription(opts: { description: string; price: string; priceLabel: string }): string {
  const parts: string[] = []
  if (opts.description?.trim()) parts.push(opts.description.trim())
  if (opts.price && opts.priceLabel) parts.push(`Listing Price: ${opts.price} ${opts.priceLabel}`)
  return parts.join('\n\n').slice(0, 800)
}

function TokenLaunchRecoveryForm({
  listingId,
  listingUrl,
  wallet,
  onSuccess,
}: {
  listingId: string
  listingUrl: string
  wallet: string
  onSuccess: () => void
}) {
  const [mint, setMint] = useState('')
  const [linking, setLinking] = useState(false)

  const handleLink = async () => {
    const trimmed = mint.trim()
    if (!trimmed || !BASE58.test(trimmed)) {
      alert('Enter a valid Solana mint address (base58, 32-44 chars)')
      return
    }
    if (!wallet) {
      alert('Connect your wallet')
      return
    }
    setLinking(true)
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, token_mint: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to link token')
      onSuccess()
    } catch (e) {
      alert('Failed to link: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder="Token mint address (e.g. from pump.fun URL)"
        value={mint}
        onChange={(e) => setMint(e.target.value)}
        className="flex-1 font-mono text-sm"
      />
      <Button
        onClick={handleLink}
        disabled={linking}
        className="border-2 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black"
      >
        {linking ? 'Linking...' : 'Link & go to listing'}
      </Button>
    </div>
  )
}

export default function CreateListingForm() {
  const { publicKey, signTransaction, signMessage } = useWallet()
  const { connection } = useConnection()
  const router = useRouter()
  const { tier: tierState, refresh } = useTier()
  const [loading, setLoading] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [limitCheck, setLimitCheck] = useState<{
    currentCount: number
    maxAllowed: number
    canCreate: boolean
    tier?: string
    fsbd_token_mint?: string | null
    isEarlyAdopter?: boolean
    subscriptionActive?: boolean
  } | null>(null)
  // Use highest tier from both sources (TierProvider + limit-check) so we don't miss holdings
  const maxImages = isAdminUser ? 4 : Math.max(
    getMaxImagesForTier((limitCheck?.tier ?? 'free') as 'free' | 'bronze' | 'silver' | 'gold' | 'platinum'),
    getMaxImagesForTier(tierState.tier)
  )

  useEffect(() => {
    if (!publicKey) {
      setIsAdminUser(false)
      return
    }
    fetch(`/api/admin/check?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((res) => res.json())
      .then((data) => setIsAdminUser(!!data?.isAdmin))
      .catch(() => setIsAdminUser(false))
  }, [publicKey?.toString()])

  useEffect(() => {
    if (!publicKey) {
      setLimitCheck(null)
      return
    }
    fetch(`/api/listings/limit-check?wallet=${encodeURIComponent(publicKey.toString())}`)
      .then((res) => res.json())
      .then((data) =>
        setLimitCheck({
          currentCount: data.currentCount ?? 0,
          maxAllowed: data.maxAllowed ?? 1,
          canCreate: data.canCreate !== false,
          tier: data.tier ?? 'free',
          fsbd_token_mint: data.fsbd_token_mint ?? null,
          isEarlyAdopter: data.isEarlyAdopter ?? false,
          subscriptionActive: data.subscriptionActive ?? false,
        })
      )
      .catch(() => setLimitCheck({ currentCount: 0, maxAllowed: 1, canCreate: true, tier: 'free' }))
  }, [publicKey?.toString()])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'for-sale',
    price: '',
    priceToken: 'SOL',
    quantity: 1,
    images: [] as File[],
    importedImageUrls: [] as string[],
    launchToken: false,
    tokenName: '',
    tokenSymbol: '',
    devBuySol: 0.01,
    deliveryMethod: 'ship' as 'ship' | 'local_pickup' | 'both',
    locationCity: '',
    locationRegion: '',
    externalListingUrl: '',
    subcategory: '',
    assetMint: '',
    memeCoinMinPercent: 1,
    assetCollectionName: '',
    tokenWebsite: '',
    tokenTwitter: '',
    tokenTelegram: '',
    tokenDiscord: '',
    tokenBannerUrl: '',
    chatTokenGated: true,
    chatMinTokens: 1,
    vanitySuffix: 'pump',
  })
  const [assetVerified, setAssetVerified] = useState<{ verified: boolean; error?: string } | null>(null)
  const [createdListingForToken, setCreatedListingForToken] = useState<{
    id: string
    url: string
    imageUrls: string[]
    imagesToUpload: File[]
  } | null>(null)
  const [creatingListing, setCreatingListing] = useState(false)
  const [importingFromUrl, setImportingFromUrl] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    title?: string
    description?: string
    price?: string
    imageUrl?: string
    category?: string
    subcategory?: string
  } | null>(null)
  const [importToggles, setImportToggles] = useState({
    title: true,
    description: true,
    price: true,
    image: true,
    category: true,
    subcategory: true,
  })
  const [applyingImport, setApplyingImport] = useState(false)
  const [tokenLaunchRecovery, setTokenLaunchRecovery] = useState<{ listingId: string; listingUrl: string } | null>(null)

  const { keypair: vanityKeypair, generating: vanityGenerating, consume: consumeVanity } = useVanityGrind(
    formData.vanitySuffix || 'pump',
    formData.launchToken
  )

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [imageValidationError, setImageValidationError] = useState<string | null>(null)
  useEffect(() => {
    const file = formData.images[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    if (formData.importedImageUrls?.[0]) {
      setPreviewImageUrl(formData.importedImageUrls[0])
      return
    }
    setPreviewImageUrl(null)
  }, [formData.images, formData.importedImageUrls])

  const handleCreateListingFirst = async () => {
    if (!publicKey || !formData.launchToken) return
    const hasImages = formData.images.length > 0 || (formData.importedImageUrls?.length ?? 0) > 0
    if (!formData.title?.trim() || !formData.description?.trim() || !formData.price || !hasImages) {
      alert('Fill title, description, price, and add at least one image before creating the listing.')
      return
    }
    if (!formData.tokenName?.trim() || !formData.tokenSymbol?.trim()) {
      alert('Enter token name and symbol.')
      return
    }
    const firstImage = formData.images[0]
    if (firstImage) {
      const iconResult = await validateIconImage(firstImage)
      if (!iconResult.ok) {
        setImageValidationError(iconResult.error)
        alert(iconResult.error)
        return
      }
    }
    try {
      setCreatingListing(true)
      const fresh = await refresh()
      const imageUrls: string[] = [...(formData.importedImageUrls || [])]
      const allowedImages = Math.min(formData.images.length, isAdminUser ? 4 : getMaxImagesForTier(fresh.tier))
      const rawImages = formData.images.slice(0, allowedImages)
      const imagesToUpload = await stripImageMetadataBatch(rawImages)
      if (imagesToUpload?.length) {
        const urls = await uploadMultipleImagesToIPFS(imagesToUpload)
        imageUrls.push(...urls)
      }
      if (imageUrls.length === 0) {
        throw new Error('Failed to upload images to IPFS')
      }
      const fee = calculateListingFee(fresh.tier)
      const isDigitalAsset = formData.category === 'digital-assets'
      const listingDataForCreate: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        quantity: Math.max(1, Math.floor(Number(formData.quantity) || 1)),
        images: imageUrls,
        wallet_address_hash: hashWalletAddress(publicKey.toString()),
        wallet_address: publicKey.toString(),
        has_token: true,
        token_mint: null,
        token_name: formData.tokenName || null,
        token_symbol: formData.tokenSymbol || null,
        fee_paid: fee,
        status: 'active',
        delivery_method: formData.deliveryMethod,
        location_city: formData.locationCity.trim() || null,
        location_region: formData.locationRegion.trim() || null,
        external_listing_url: formData.externalListingUrl.trim() || null,
        subcategory: formData.subcategory.trim() || null,
        chat_token_gated: formData.chatTokenGated,
        chat_min_tokens: Math.max(1, Math.floor(Number(formData.chatMinTokens) || 1)),
        price_token: formData.priceToken === 'LISTING_TOKEN' ? 'LISTING_TOKEN' : formData.priceToken,
      }
      if (isDigitalAsset) {
        listingDataForCreate.asset_type = formData.subcategory === 'nft' ? 'nft' : 'meme_coin'
        listingDataForCreate.asset_chain = 'solana'
        listingDataForCreate.asset_mint = formData.assetMint.trim()
        listingDataForCreate.meme_coin_min_percent = formData.subcategory === 'meme_coin' ? formData.memeCoinMinPercent : null
        listingDataForCreate.asset_collection_name = formData.assetCollectionName.trim() || null
        listingDataForCreate.asset_verified_at = new Date().toISOString()
      }
      const createRes = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingDataForCreate),
      })
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}))
        throw new Error(errData.error || `Failed to create listing (${createRes.status})`)
      }
      const created = await createRes.json()
      const listingId = created?.id
      if (!listingId) throw new Error('Listing created but no ID returned')
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fsbd.fun'
      const listingUrl = `${baseUrl}/listings/${listingId}`
      setCreatedListingForToken({
        id: listingId,
        url: listingUrl,
        imageUrls,
        imagesToUpload: imagesToUpload || [],
      })
      setFormData(prev => ({ ...prev, tokenWebsite: listingUrl }))
      try {
        await upsertUserProfile(publicKey.toString(), { tier: fresh.tier })
        await incrementListingCount(publicKey.toString())
        fetch(`/api/listings/limit-check?wallet=${encodeURIComponent(publicKey.toString())}`)
          .then((r) => r.json())
          .then((d) => setLimitCheck({ currentCount: d.currentCount ?? 0, maxAllowed: d.maxAllowed ?? 3, canCreate: d.canCreate !== false, tier: d.tier ?? 'free', fsbd_token_mint: d.fsbd_token_mint ?? null }))
          .catch(() => {})
      } catch { /* non-fatal */ }
      alert('Listing created! The listing link is now in the Website field. Add optional socials and click "Launch token" below.')
    } catch (err: unknown) {
      console.error(err)
      alert('Failed to create listing: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setCreatingListing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey || !connection) {
      alert('Please connect your wallet')
      return
    }
    
    if (formData.category === 'digital-assets') {
      if (!formData.subcategory || !formData.assetMint) {
        alert('Select a subcategory (NFT or Meme Coin) and enter the mint address.')
        return
      }
      if (!assetVerified?.verified) {
        alert('Verify ownership before creating. Click "Verify Ownership" and ensure it succeeds.')
        return
      }
    } else {
      const hasImages = formData.images.length > 0 || (formData.importedImageUrls?.length ?? 0) > 0
      if (!hasImages) {
        alert('Add at least one image (upload files or import from product URL).')
        return
      }
    }

    // Check if signMessage is available (required for non-token listings)
    if (!formData.launchToken && !signMessage && formData.category !== 'digital-assets') {
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
      const fresh = await refresh()
      const skipImageUpload = formData.launchToken && !!createdListingForToken
      let imagesToUpload: File[] = []
      let imageUrls: string[] = []
      imageUrls = [...(formData.importedImageUrls || [])]
      if (!skipImageUpload) {
        const allowedImages = Math.min(formData.images.length, isAdminUser ? 4 : getMaxImagesForTier(fresh.tier))
        const rawImages = formData.images.slice(0, allowedImages)
        imagesToUpload = await stripImageMetadataBatch(rawImages) || []
        if (imagesToUpload.length > 0) {
          try {
            const urls = await uploadMultipleImagesToIPFS(imagesToUpload)
            imageUrls.push(...urls)
            console.log('Uploaded images:', urls)
          } catch (error: any) {
            console.error('IPFS upload error:', error)
            throw new Error('Failed to upload images to IPFS: ' + (error.message || 'Please check your Pinata JWT'))
          }
        }
      }

      // Launch token if requested (pump.fun with dev buy, fallback to SPL)
      let tokenMint: string | null = null
      let fee = 0
      if (formData.launchToken && formData.tokenName && formData.tokenSymbol) {
        const usePreCreated = !!createdListingForToken
        const effectiveImageUrls = usePreCreated ? createdListingForToken.imageUrls : imageUrls
        const effectiveImagesToUpload = usePreCreated ? createdListingForToken.imagesToUpload : imagesToUpload
        const imageFile = effectiveImagesToUpload?.[0]
        const imageUrl = effectiveImageUrls?.[0]
        if (!imageFile && !imageUrl) {
          throw new Error('Token launch on pump.fun requires at least one image. Add an image and create the listing first.')
        }
        if (imageFile) {
          const iconResult = await validateIconImage(imageFile)
          if (!iconResult.ok) {
            setImageValidationError(iconResult.error)
            throw new Error(iconResult.error)
          }
        }

        const priceLabel = formatPriceToken(formData.priceToken, formData.tokenSymbol)
        const listingDescription = buildTokenDescription({
          description: formData.description,
          price: formData.price,
          priceLabel,
        })

        fee = calculateListingFee(fresh.tier)
        const devBuy = Math.max(0, formData.devBuySol ?? 0.01)

        let listingId: string
        let listingUrl: string

        if (usePreCreated) {
          listingId = createdListingForToken.id
          listingUrl = createdListingForToken.url
        } else {
          // 1. Create listing first so we can link the listing page in token metadata
          const isDigitalAsset = formData.category === 'digital-assets'
          const listingDataForCreate: Record<string, unknown> = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            price: parseFloat(formData.price),
            price_token: formData.priceToken === 'LISTING_TOKEN' ? 'LISTING_TOKEN' : formData.priceToken,
            quantity: Math.max(1, Math.floor(Number(formData.quantity) || 1)),
            images: imageUrls,
            wallet_address_hash: hashWalletAddress(publicKey.toString()),
            wallet_address: publicKey.toString(),
            has_token: true,
            token_mint: null,
            token_name: formData.tokenName || null,
            token_symbol: formData.tokenSymbol || null,
            fee_paid: fee,
            status: 'active',
            delivery_method: formData.deliveryMethod,
            location_city: formData.locationCity.trim() || null,
            location_region: formData.locationRegion.trim() || null,
            external_listing_url: formData.externalListingUrl.trim() || null,
            subcategory: formData.subcategory.trim() || null,
            chat_token_gated: formData.chatTokenGated,
            chat_min_tokens: Math.max(1, Math.floor(Number(formData.chatMinTokens) || 1)),
          }
          if (isDigitalAsset) {
            listingDataForCreate.asset_type = formData.subcategory === 'nft' ? 'nft' : 'meme_coin'
            listingDataForCreate.asset_chain = 'solana'
            listingDataForCreate.asset_mint = formData.assetMint.trim()
            listingDataForCreate.meme_coin_min_percent = formData.subcategory === 'meme_coin' ? formData.memeCoinMinPercent : null
            listingDataForCreate.asset_collection_name = formData.assetCollectionName.trim() || null
            listingDataForCreate.asset_verified_at = new Date().toISOString()
          }
          const createRes = await fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listingDataForCreate),
          })
          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}))
            throw new Error(errData.error || `Failed to create listing (${createRes.status})`)
          }
          const created = await createRes.json()
          listingId = created?.id
          if (!listingId) throw new Error('Listing created but no ID returned')
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fsbd.fun'
          listingUrl = `${baseUrl}/listings/${listingId}`
        }

        // 2. Build extras: always listing URL; optional socials from form (tier-gated) or profile
        let extras: { externalUrl?: string; website?: string; twitter?: string; telegram?: string; discord?: string; bannerUrl?: string } = { externalUrl: listingUrl }
        const canAddSocials = canAddSocialsForTier(fresh.tier) || isAdminUser
        if (canAddSocials) {
          const fromForm = formData.tokenWebsite || formData.tokenTwitter || formData.tokenTelegram || formData.tokenDiscord || formData.tokenBannerUrl
          if (fromForm) {
            extras.website = formData.tokenWebsite?.trim() || undefined
            extras.twitter = formData.tokenTwitter?.trim() || undefined
            extras.telegram = formData.tokenTelegram?.trim() || undefined
            extras.discord = formData.tokenDiscord?.trim() || undefined
            extras.bannerUrl = formData.tokenBannerUrl?.trim() || undefined
          } else {
            try {
              const profileRes = await fetch(`/api/profile?wallet=${encodeURIComponent(publicKey.toString())}`)
              if (profileRes.ok) {
                const { profile: p } = await profileRes.json()
                if (p?.website_url || p?.twitter_url || p?.telegram_url || p?.discord_url || p?.banner_url) {
                  extras.website = p?.website_url || undefined
                  extras.twitter = p?.twitter_url || undefined
                  extras.telegram = p?.telegram_url || undefined
                  extras.discord = p?.discord_url || undefined
                  extras.bannerUrl = p?.banner_url || undefined
                }
              }
            } catch { /* non-fatal */ }
          }
        }

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
              description: listingDescription || formData.description?.slice(0, 500) || undefined,
              extras,
              mintKeypair: vanityKeypair ?? undefined,
            }
          )
          if (vanityKeypair) consumeVanity()
        } catch (pumpErr: unknown) {
          const msg = pumpErr instanceof Error ? pumpErr.message : String(pumpErr)
          const txMayHaveSucceeded =
            /Transaction may have succeeded|check your wallet for the token|read-only account|instruction changed the balance|Transaction simulation failed|custom program error|0x1/i.test(msg)
          if (txMayHaveSucceeded) {
            setTokenLaunchRecovery({ listingId, listingUrl })
            setLoading(false)
            throw pumpErr
          }
          if (/image|IPFS|pump/i.test(msg)) throw pumpErr
          tokenMint = await createListingToken(publicKey, signTransaction!, connection, formData.tokenName, formData.tokenSymbol)
        }

        // Update listing with token_mint right away
        if (tokenMint && listingId) {
          await fetch(`/api/listings/${listingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: publicKey.toString(), token_mint: tokenMint }),
          })
        }

        // Pay listing fee only when launching token
        const appWallet = new PublicKey(
          process.env.NEXT_PUBLIC_APP_WALLET || '11111111111111111111111111111111'
        )
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: appWallet,
            lamports: Math.floor(fee * LAMPORTS_PER_SOL),
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

        // Update user profile stats (skip increment if listing was created in step 1)
        try {
          await upsertUserProfile(publicKey.toString(), { tier: fresh.tier })
          if (!usePreCreated) await incrementListingCount(publicKey.toString())
          await addToTotalFees(publicKey.toString(), fee)
        } catch (error) {
          console.error('Error updating user profile:', error)
        }

        alert(`Listing created! Redirecting...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        router.push(`/listings/${listingId}`)
        return
      } else {
        // Donate unused vanity keypair to pool for the next person
        if (vanityKeypair) {
          fetch('/api/vanity-pool/donate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              publicKey: vanityKeypair.publicKey.toBase58(),
              secretKey: Array.from(vanityKeypair.secretKey),
              suffix: formData.vanitySuffix || 'pump',
            }),
          }).catch(() => {})
          consumeVanity()
        }
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
          await upsertUserProfile(publicKey.toString(), { tier: fresh.tier })
          await incrementListingCount(publicKey.toString())
        } catch (error) {
          console.error('Error updating user profile:', error)
          // Don't fail the listing creation if profile update fails
        }
      }

      // Create listing in database
      const isDigitalAsset = formData.category === 'digital-assets'
      const listingData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        price_token: formData.priceToken === 'LISTING_TOKEN' && tokenMint ? 'LISTING_TOKEN' : formData.priceToken,
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
        subcategory: formData.subcategory.trim() || null,
        chat_token_gated: formData.chatTokenGated,
        chat_min_tokens: Math.max(1, Math.floor(Number(formData.chatMinTokens) || 1)),
      }
      if (isDigitalAsset) {
        listingData.asset_type = formData.subcategory === 'nft' ? 'nft' : 'meme_coin'
        listingData.asset_chain = 'solana'
        listingData.asset_mint = formData.assetMint.trim()
        listingData.meme_coin_min_percent = formData.subcategory === 'meme_coin' ? formData.memeCoinMinPercent : null
        listingData.asset_collection_name = formData.assetCollectionName.trim() || null
        listingData.asset_verified_at = new Date().toISOString() // Set on insert; API will verify
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
      if (!/Transaction may have succeeded|check your wallet|read-only account|instruction changed the balance|Transaction simulation failed|custom program error|0x1/i.test(errorMessage)) {
        alert('Failed to create listing: ' + errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full max-w-full relative z-10">
      <div className="p-4 border-2 border-[#660099]/50 rounded-lg bg-[#660099]/5">
        <label className="block text-sm font-medium mb-2">Import from product URL (optional)</label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://amazon.com/dp/... or eBay, Etsy, etc."
            value={formData.externalListingUrl}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, externalListingUrl: e.target.value }))
              setImportPreview(null)
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={!formData.externalListingUrl.trim() || importingFromUrl}
            onClick={async () => {
              const url = formData.externalListingUrl.trim()
              if (!url) return
              setImportingFromUrl(true)
              setImportPreview(null)
              try {
                const res = await fetch('/api/fetch-product-info', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Failed to fetch')
                const hasAny = !!(data.title || data.description || data.price || data.imageUrl || data.category || data.subcategory)
                if (!hasAny) {
                  alert('Could not extract product details from this URL. Try another site or enter manually.')
                } else {
                  setImportPreview({
                    title: data.title,
                    description: data.description,
                    price: data.price,
                    imageUrl: data.imageUrl,
                    category: data.category || 'for-sale',
                    subcategory: data.subcategory,
                  })
                  setImportToggles({
                    title: !!data.title,
                    description: !!data.description,
                    price: !!data.price,
                    image: !!data.imageUrl,
                    category: !!data.category,
                    subcategory: !!data.subcategory,
                  })
                }
              } catch (e) {
                alert('Import failed: ' + (e instanceof Error ? e.message : String(e)))
              } finally {
                setImportingFromUrl(false)
              }
            }}
          >
            {importingFromUrl ? 'Importing…' : 'Import'}
          </Button>
        </div>
        <p className="text-sm text-[#aa77ee] font-pixel-alt mt-1">Paste a product URL and click Import. Review the preview and choose what to use before submitting.</p>

        {importPreview && (
          <div className="mt-4 p-4 rounded-lg border border-[#00ff00]/40 bg-[#00ff00]/5">
            <p className="text-sm font-medium text-[#00ff00] mb-3">Review imported data — toggle what to apply</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="imp-title"
                  checked={importToggles.title}
                  onChange={(e) => setImportToggles(t => ({ ...t, title: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-title" className="flex-1 text-sm">
                  <span className="text-muted-foreground">Title:</span>{' '}
                  {importPreview.title ? (importPreview.title.length > 60 ? importPreview.title.slice(0, 60) + '…' : importPreview.title) : '—'}
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="imp-price"
                  checked={importToggles.price}
                  onChange={(e) => setImportToggles(t => ({ ...t, price: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-price" className="flex-1 text-sm">
                  <span className="text-muted-foreground">Price:</span> {importPreview.price || '—'}
                </label>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  id="imp-desc"
                  checked={importToggles.description}
                  onChange={(e) => setImportToggles(t => ({ ...t, description: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-desc" className="flex-1 text-sm">
                  <span className="text-muted-foreground">Description:</span>{' '}
                  {importPreview.description ? (importPreview.description.length > 80 ? importPreview.description.slice(0, 80) + '…' : importPreview.description) : '—'}
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="imp-img"
                  checked={importToggles.image}
                  onChange={(e) => setImportToggles(t => ({ ...t, image: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-img" className="flex-1 text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">Image:</span>
                  {importPreview.imageUrl ? (
                    <img src={importPreview.imageUrl} alt="Imported" className="h-12 w-12 object-cover rounded border" />
                  ) : (
                    '—'
                  )}
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="imp-cat"
                  checked={importToggles.category}
                  onChange={(e) => setImportToggles(t => ({ ...t, category: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-cat" className="flex-1 text-sm">
                  <span className="text-muted-foreground">Category:</span> {importPreview.category || '—'}
                </label>
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="imp-sub"
                  checked={importToggles.subcategory}
                  onChange={(e) => setImportToggles(t => ({ ...t, subcategory: e.target.checked }))}
                  className="mt-1"
                />
                <label htmlFor="imp-sub" className="flex-1 text-sm">
                  <span className="text-muted-foreground">Subcategory:</span> {importPreview.subcategory || '—'}
                </label>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20"
                disabled={applyingImport}
                onClick={async () => {
                  setApplyingImport(true)
                  const updates: Partial<typeof formData> = {}
                  if (importToggles.title && importPreview.title) updates.title = importPreview.title
                  if (importToggles.description && importPreview.description) updates.description = importPreview.description
                  if (importToggles.price && importPreview.price) updates.price = importPreview.price
                  if (importToggles.category && importPreview.category) updates.category = importPreview.category
                  if (importToggles.subcategory && importPreview.subcategory) updates.subcategory = importPreview.subcategory
                  // Preset USDC for imported listings (external prices are usually USD); user can change to any crypto
                  updates.priceToken = 'USDC'
                  let importedUrl: string | null = null
                  if (importToggles.image && importPreview.imageUrl) {
                    try {
                      const res = await fetch('/api/upload-image-from-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageUrl: importPreview.imageUrl }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok && data.url) importedUrl = data.url
                    } catch {
                      alert('Failed to upload imported image. You can add it manually.')
                    }
                  }
                  setFormData(prev => ({
                    ...prev,
                    ...updates,
                    ...(importedUrl ? { importedImageUrls: [...(prev.importedImageUrls || []), importedUrl] } : {}),
                  }))
                  setImportPreview(null)
                  setApplyingImport(false)
                }}
              >
                {applyingImport ? 'Applying…' : 'Apply selected'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImportPreview(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

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
            <label className="block text-sm font-medium mb-2">Subcategory *</label>
            <Select
              value={formData.subcategory || 'none'}
              onValueChange={(v) => {
                setFormData(prev => ({ ...prev, subcategory: v === 'none' ? '' : v }))
                setAssetVerified(null)
              }}
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
                {formData.launchToken && (
                  <SelectItem value="LISTING_TOKEN">My token{formData.tokenSymbol ? ` (${formData.tokenSymbol})` : ''}</SelectItem>
                )}
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

      {formData.category === 'digital-assets' && (
        <div className="p-4 border-2 border-[#660099] rounded-lg space-y-4 bg-[#660099]/10">
          <p className="text-sm text-[#00ff00] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Prove ownership to list as verified collection. Solana supported.
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">
              {formData.subcategory === 'nft' ? 'NFT Mint Address *' : 'Token Mint Address *'}
            </label>
            <Input
              placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              value={formData.assetMint}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, assetMint: e.target.value.trim() }))
                setAssetVerified(null)
              }}
            />
          </div>
          {formData.subcategory === 'meme_coin' && (
            <div>
              <label className="block text-sm font-medium mb-2">Min % of supply you hold *</label>
              <Input
                type="number"
                min={0.01}
                max={100}
                step={0.01}
                placeholder="1"
                value={formData.memeCoinMinPercent || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, memeCoinMinPercent: parseFloat(e.target.value) || 0 }))
                  setAssetVerified(null)
                }}
              />
              <p className="text-xs text-[#aa77ee] mt-1">You must hold at least this % of total supply to list.</p>
            </div>
          )}
          {formData.subcategory === 'nft' && (
            <div>
              <label className="block text-sm font-medium mb-2">Collection name (optional)</label>
              <Input
                placeholder="e.g. Mad Lads"
                value={formData.assetCollectionName}
                onChange={(e) => setFormData(prev => ({ ...prev, assetCollectionName: e.target.value.trim() }))}
              />
            </div>
          )}
          <button
            type="button"
            disabled={!formData.assetMint || loading}
            onClick={async () => {
              if (!publicKey || !formData.assetMint) return
              setAssetVerified(null)
              try {
                const res = await fetch('/api/verify-asset-ownership', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    wallet: publicKey.toString(),
                    assetType: formData.subcategory === 'nft' ? 'nft' : 'meme_coin',
                    mint: formData.assetMint,
                    minPercent: formData.subcategory === 'meme_coin' ? formData.memeCoinMinPercent : 0,
                  }),
                })
                const data = await res.json()
                if (data.verified) {
                  setAssetVerified({ verified: true })
                } else {
                  setAssetVerified({ verified: false, error: data.error || 'Ownership verification failed' })
                }
              } catch {
                setAssetVerified({ verified: false, error: 'Verification failed. Try again.' })
              }
            }}
            className="px-4 py-2 border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-pixel-alt text-sm rounded"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Verify Ownership
          </button>
          {assetVerified?.verified && (
            <p className="text-sm text-[#00ff00] font-pixel-alt">✓ Ownership verified</p>
          )}
          {assetVerified?.verified === false && (
            <p className="text-sm text-red-400 font-pixel-alt">{assetVerified.error}</p>
          )}
        </div>
      )}

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
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="block text-sm font-medium">Images (IPFS)</label>
          {publicKey && (
            <button
              type="button"
              onClick={async () => {
                await refresh()
                if (publicKey) {
                  fetch(`/api/listings/limit-check?wallet=${encodeURIComponent(publicKey.toString())}`)
                    .then((r) => r.json())
                    .then((d) =>
                      setLimitCheck({
                        currentCount: d.currentCount ?? 0,
                        maxAllowed: d.maxAllowed ?? 3,
                        canCreate: d.canCreate !== false,
                        tier: d.tier ?? 'free',
                        fsbd_token_mint: d.fsbd_token_mint ?? null,
                      })
                    )
                    .catch(() => {})
                }
              }}
              className="text-xs text-[#660099] hover:text-[#00ff00] font-pixel-alt border border-[#660099] px-2 py-1 rounded transition-colors"
              style={{ fontFamily: 'var(--font-pixel-alt)' }}
            >
              {tierState.loading ? 'Refreshing…' : 'Refresh tier'}
            </button>
          )}
        </div>
        <Input
          type="file"
          multiple={maxImages > 1}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="min-h-[44px] text-base sm:text-sm w-full"
          onChange={async (e) => {
            const files = Array.from(e.target.files || [])
            const limited = files.slice(0, maxImages)
            if (files.length > maxImages) {
              alert(`Your tier allows up to ${maxImages} image(s) per listing. Only the first ${maxImages} will be used.`)
            }
            const maxSize = 4.5 * 1024 * 1024 // 4.5MB for marketplace compatibility
            const invalidSize = limited.find((f: File) => f.size > maxSize)
            if (invalidSize) {
              setImageValidationError('Image must be under 4.5MB for pump.fun/DEX. Use PNG, JPG, WebP, or GIF.')
              return
            }
            setImageValidationError(null)
            if (formData.launchToken && limited[0]) {
              const result = await validateIconImage(limited[0])
              if (!result.ok) {
                setImageValidationError(result.error)
                return
              }
            }
            setFormData(prev => ({ ...prev, images: limited }))
          }}
        />
        <p className="text-sm text-[#aa77ee] font-pixel-alt mt-1">
          Up to {maxImages} image{maxImages > 1 ? 's' : ''} per listing. Icon (1st image): 1:1 square, min 100px, max 4.5MB. PNG/JPG/WebP/GIF.
        </p>
        {imageValidationError && (
          <p className="text-xs text-amber-400 mt-1 font-pixel-alt">{imageValidationError}</p>
        )}
        {(formData.images.length > 0 || (formData.importedImageUrls?.length ?? 0) > 0) && (
          <p className="text-xs text-[#00ff00] mt-1">
            {formData.images.length > 0 && `${formData.images.length} file(s) selected (max ${maxImages})`}
            {formData.images.length > 0 && (formData.importedImageUrls?.length ?? 0) > 0 && ' + '}
            {(formData.importedImageUrls?.length ?? 0) > 0 && `${formData.importedImageUrls!.length} imported`}
          </p>
        )}
      </div>

      {formData.category !== 'digital-assets' && (
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={formData.launchToken}
            onChange={(e) => {
              const checked = e.target.checked
              setFormData(prev => ({ ...prev, launchToken: checked }))
              if (!checked) setCreatedListingForToken(null)
            }}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">Launch a token for this listing (fun/marketing)</span>
        </label>

        {formData.launchToken && (
          <div className="grid grid-cols-2 gap-4 ml-6 space-y-2">
            {!createdListingForToken ? (
              <div className="col-span-2">
                <Button
                  type="button"
                  onClick={handleCreateListingFirst}
                  disabled={creatingListing || !formData.title?.trim() || !formData.description?.trim() || !formData.price || (formData.images.length === 0 && (formData.importedImageUrls?.length ?? 0) === 0) || !formData.tokenName?.trim() || !formData.tokenSymbol?.trim()}
                  variant="outline"
                  className="w-full border-[#660099] text-[#00ff00] hover:bg-[#660099]/20"
                >
                  {creatingListing ? 'Creating listing...' : '1. Create listing first (get link for token metadata)'}
                </Button>
                <p className="text-xs text-[#aa77ee] mt-1 font-pixel-alt">Create the listing first so the listing URL can be added to your token metadata.</p>
              </div>
            ) : (
              <div className="col-span-2 p-3 rounded border border-[#00ff00]/50 bg-[#00ff00]/5">
                <p className="text-sm text-[#00ff00] font-medium">Listing created</p>
                <p className="text-xs text-muted-foreground mt-1 break-all">{createdListingForToken.url}</p>
                <p className="text-xs text-[#aa77ee] mt-1">Link auto-filled below. Add optional socials, then click &quot;Launch token&quot;.</p>
              </div>
            )}
            <div className="col-span-2">
              <TokenPreviewCard
                tokenName={formData.tokenName}
                tokenSymbol={formData.tokenSymbol}
                description={buildTokenDescription({
                  description: formData.description,
                  price: formData.price,
                  priceLabel: formatPriceToken(formData.priceToken, formData.tokenSymbol),
                })}
                imageUrl={createdListingForToken?.imageUrls?.[0] ?? previewImageUrl}
                bannerUrl={formData.tokenBannerUrl || undefined}
                website={formData.tokenWebsite || createdListingForToken?.url}
                twitter={formData.tokenTwitter}
                telegram={formData.tokenTelegram}
                discord={formData.tokenDiscord}
                contractPreview={vanityKeypair ? `${vanityKeypair.publicKey.toBase58().slice(0, 4)}...${vanityKeypair.publicKey.toBase58().slice(-4)}` : undefined}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Token Name</label>
              <Input
                type="text"
                value={formData.tokenName}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenName: e.target.value }))}
                placeholder="My Item Token"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Token Symbol</label>
              <Input
                type="text"
                value={formData.tokenSymbol}
                onChange={(e) => setFormData(prev => ({ ...prev, tokenSymbol: e.target.value }))}
                maxLength={10}
                placeholder="MIT"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.chatTokenGated}
                  onChange={(e) => setFormData(prev => ({ ...prev, chatTokenGated: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Token-gate public chat (holders only)</span>
              </label>
              <p className="text-xs text-muted-foreground">When enabled, only token holders and you can read/post in the listing&apos;s public chat.</p>
              {formData.chatTokenGated && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Min tokens to chat:</span>
                  {[1, 10, 100, 1000, 10000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, chatMinTokens: n }))}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        formData.chatMinTokens === n
                          ? 'border-[#00ff00] bg-[#00ff00]/20 text-[#00ff00]'
                          : 'border-[#660099] text-[#aa77ee] hover:bg-[#660099]/20'
                      }`}
                    >
                      {n === 1 ? '1 (default)' : n.toLocaleString()}
                    </button>
                  ))}
                  <span className="text-xs text-muted-foreground">or</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.chatMinTokens}
                    onChange={(e) => {
                      const v = Math.max(1, Math.floor(Number(e.target.value) || 1))
                      setFormData(prev => ({ ...prev, chatMinTokens: v }))
                    }}
                    className="w-20 px-2 py-1 text-xs bg-black border border-[#660099] text-[#00ff00] rounded"
                  />
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Dev buy (SOL) — initial buy on pump.fun</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formData.devBuySol}
                onChange={(e) => setFormData(prev => ({ ...prev, devBuySol: Math.max(0, parseFloat(e.target.value) || 0) }))}
                placeholder="0.01"
              />
              <p className="text-xs text-[#aa77ee] font-pixel-alt mt-1" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                Optional SOL to buy your token at launch (pump.fun). Use 0 to skip.
              </p>
              {(vanityGenerating || vanityKeypair) && (
                <p className="text-xs mt-1 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  {vanityGenerating ? (
                    <span className="text-[#aa77ee]">Generating vanity address ending in &quot;pump&quot;… (runs in background)</span>
                  ) : vanityKeypair ? (
                    <span className="text-[#00ff00]">✓ Vanity address ready! Token will end in &quot;pump&quot;.</span>
                  ) : null}
                </p>
              )}
            </div>
            {(canAddSocialsForTier((limitCheck?.tier ?? tierState.tier) as 'free' | 'bronze' | 'silver' | 'gold' | 'platinum') || isAdminUser) && (
              <div className="col-span-2 space-y-2 pt-2 border-t border-[#660099]/30">
                <p className="text-xs text-[#aa77ee] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
                  Optional socials for token metadata (100k+ $FSBD). Website = listing link (auto-filled after step 1) or your personal site.
                </p>
                <div className="grid gap-2">
                  <Input placeholder={createdListingForToken ? 'Listing link (auto-filled)' : 'Website — create listing first to auto-fill'} value={formData.tokenWebsite} onChange={(e) => setFormData(prev => ({ ...prev, tokenWebsite: e.target.value }))} className="bg-black border-[#660099] text-[#00ff00]" />
                  <Input placeholder="Twitter/X URL" value={formData.tokenTwitter} onChange={(e) => setFormData(prev => ({ ...prev, tokenTwitter: e.target.value }))} className="bg-black border-[#660099] text-[#00ff00]" />
                  <Input placeholder="Telegram URL" value={formData.tokenTelegram} onChange={(e) => setFormData(prev => ({ ...prev, tokenTelegram: e.target.value }))} className="bg-black border-[#660099] text-[#00ff00]" />
                  <Input placeholder="Discord URL" value={formData.tokenDiscord} onChange={(e) => setFormData(prev => ({ ...prev, tokenDiscord: e.target.value }))} className="bg-black border-[#660099] text-[#00ff00]" />
                  <Input placeholder="Banner image URL — 3:1 ratio, min 600px wide (e.g. 600x200)" value={formData.tokenBannerUrl} onChange={(e) => setFormData(prev => ({ ...prev, tokenBannerUrl: e.target.value }))} className="bg-black border-[#660099] text-[#00ff00]" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {tokenLaunchRecovery && (
        <div className="mb-4 p-4 border-2 border-amber-500 bg-amber-950/30 rounded">
          <h3 className="font-pixel text-amber-400 mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            Token may have launched — link it manually
          </h3>
          <p className="text-sm text-[#aa77ee] font-pixel-alt mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            If you see your token in your wallet, paste the mint address from pump.fun to link it to your listing.
          </p>
          <TokenLaunchRecoveryForm
            listingId={tokenLaunchRecovery.listingId}
            listingUrl={tokenLaunchRecovery.listingUrl}
            wallet={publicKey?.toString() ?? ''}
            onSuccess={() => {
              setTokenLaunchRecovery(null)
              setCreatedListingForToken(null)
              router.push(`/listings/${tokenLaunchRecovery.listingId}`)
            }}
          />
        </div>
      )}

      {limitCheck && (
        <div className="mb-2">
          <p className="text-sm text-[#aa77ee] font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            {limitCheck.currentCount} of {limitCheck.maxAllowed} listings used
          {!limitCheck.canCreate && (
            <span className="block text-amber-400 mt-1">
              {limitCheck.tier === 'free' && !limitCheck.subscriptionActive ? (
                <>At limit (1 free listing). Hold $FSBD or <Link href="/subscribe" className="underline hover:text-[#00ff00]">subscribe</Link> for more.</>
              ) : (
                <>At limit. Purchase extra slots with 10,000 $FSBD each.{limitCheck.tier === 'free' && ' If you hold $FSBD, try refreshing.'}</>
              )}
            </span>
            )}
          </p>
          {!limitCheck.canCreate && (limitCheck.tier !== 'free' || limitCheck.subscriptionActive) && (
            <BuyListingSlotButton
              fsbdMint={limitCheck.fsbd_token_mint}
              onSuccess={() => {
                fetch(`/api/listings/limit-check?wallet=${encodeURIComponent(publicKey!.toString())}`)
                  .then((res) => res.json())
                  .then((data) =>
                    setLimitCheck({
                      currentCount: data.currentCount ?? 0,
                      maxAllowed: data.maxAllowed ?? 1,
                      canCreate: data.canCreate !== false,
                      tier: data.tier ?? 'free',
                      fsbd_token_mint: data.fsbd_token_mint ?? null,
                      isEarlyAdopter: data.isEarlyAdopter ?? false,
                      subscriptionActive: data.subscriptionActive ?? false,
                    })
                  )
              }}
            />
          )}
        </div>
      )}
      {/* Listing preview — how it will appear on the feed */}
      <div className="p-4 rounded-lg border-2 border-[#660099]/50 bg-black/50">
        <h3 className="text-sm font-medium text-[#00ff00] mb-3 font-pixel-alt" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
          Preview — how your listing will appear
        </h3>
        <div
          className="bg-black/80 border-2 border-[#660099] p-3 sm:p-4 rounded flex flex-col pixel-art min-h-[180px] pointer-events-none"
          style={{ maxWidth: 400 }}
        >
          {(previewImageUrl || formData.importedImageUrls?.[0]) ? (
            <div className="w-full h-32 sm:h-40 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 overflow-hidden">
              <img
                src={previewImageUrl || formData.importedImageUrls?.[0] || ''}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-32 sm:h-40 bg-black/50 border border-[#660099] rounded mb-2 sm:mb-3 flex items-center justify-center">
              <span className="text-[#660099] text-xs">No image yet</span>
            </div>
          )}
          <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2 break-words">
            {formData.title?.trim() || 'Listing title'}
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base mb-2 line-clamp-2 flex-grow break-words">
            {formData.description?.trim() || 'Listing description'}
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mt-auto">
            <span className="text-primary font-bold text-sm sm:text-base">
              {formData.price ? `${formData.price} ${formatPriceToken(formData.priceToken, formData.tokenSymbol)}` : '—'}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {formData.subcategory
                ? getSubcategoryLabel(formData.category, formData.subcategory)
                : formData.category?.replace('-', ' ')}
              {(formData.locationCity || formData.locationRegion) && (
                <> · {[formData.locationCity, formData.locationRegion].filter(Boolean).join(', ')}</>
              )}
            </span>
          </div>
          {formData.launchToken && (
            <span className="inline-block text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded mt-2 w-fit">
              🪙 Has Token
            </span>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          loading ||
          (limitCheck !== null && !limitCheck.canCreate) ||
          (formData.category === 'digital-assets' && !assetVerified?.verified)
        }
        className="w-full min-h-[44px] text-base sm:text-sm touch-manipulation"
      >
        {loading
          ? 'Creating...'
          : formData.launchToken && createdListingForToken
            ? '2. Launch token'
            : 'Create Listing'}
      </Button>
    </form>
  )
}
