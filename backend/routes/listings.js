const express = require('express')
const router = express.Router()
const { body, validationResult, query } = require('express-validator')
const Listing = require('../models/Listing')
const crypto = require('crypto')

// Helper to hash wallet address
function hashWalletAddress(address) {
  return crypto.createHash('sha256').update(address).digest('hex')
}

// Input sanitization helper
function sanitizeInput(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 5000) // Limit length
}

// Get all listings (public)
router.get('/', [
  query('q').optional().isString().trim(),
  query('category').optional().isIn(['for-sale', 'services', 'gigs', 'housing', 'community', 'jobs'])
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { q, category } = req.query
    const query = { status: 'active' }

    if (category) {
      query.category = category
    }

    if (q) {
      query.$text = { $search: sanitizeInput(q) }
    }

    const listings = await Listing.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-walletAddressHash -buyerWalletHash') // Don't expose hashes

    // Convert to public JSON
    const publicListings = listings.map(listing => listing.toPublicJSON())

    res.json(publicListings)
  } catch (error) {
    console.error('Error fetching listings:', error)
    res.status(500).json({ error: 'Failed to fetch listings' })
  }
})

// Get single listing
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    res.json(listing.toPublicJSON())
  } catch (error) {
    console.error('Error fetching listing:', error)
    res.status(500).json({ error: 'Failed to fetch listing' })
  }
})

// Create listing
router.post('/', [
  body('title').trim().isLength({ min: 3, max: 200 }).escape(),
  body('description').trim().isLength({ min: 10, max: 5000 }).escape(),
  body('category').isIn(['for-sale', 'services', 'gigs', 'housing', 'community', 'jobs']),
  body('price').isFloat({ min: 0 }),
  body('priceToken').optional().isIn(['SOL', 'USDC']),
  body('images').optional().isArray(),
  body('walletAddress').isString().notEmpty(),
  body('launchToken').optional().isBoolean(),
  body('tokenName').optional().isString().trim(),
  body('tokenSymbol').optional().isString().trim().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    // Verify wallet address from header matches body
    const headerHash = req.headers['x-wallet-address']
    const bodyHash = hashWalletAddress(req.body.walletAddress)
    
    if (headerHash !== bodyHash) {
      return res.status(401).json({ error: 'Wallet address mismatch' })
    }

    // Sanitize inputs
    const listingData = {
      title: sanitizeInput(req.body.title),
      description: sanitizeInput(req.body.description),
      category: req.body.category,
      price: req.body.price,
      priceToken: req.body.priceToken || 'SOL',
      images: (req.body.images || []).filter(img => typeof img === 'string' && /^https?:\/\/.+/.test(img)),
      walletAddress: req.body.walletAddress,
      walletAddressHash: bodyHash,
      hasToken: req.body.launchToken || false,
      tokenMint: req.body.tokenMint || null,
      tokenName: req.body.tokenName || null,
      tokenSymbol: req.body.tokenSymbol || null,
      feePaid: req.body.feePaid || 0,
      status: 'active'
    }

    const listing = new Listing(listingData)
    await listing.save()

    res.status(201).json(listing.toPublicJSON())
  } catch (error) {
    console.error('Error creating listing:', error)
    res.status(500).json({ error: 'Failed to create listing' })
  }
})

// Purchase listing
router.post('/:id/purchase', [
  body('buyerWallet').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const listing = await Listing.findById(req.params.id)
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' })
    }

    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available' })
    }

    // Update listing status
    listing.status = 'sold'
    listing.buyerWalletHash = hashWalletAddress(req.body.buyerWallet)
    await listing.save()

    res.json({ message: 'Purchase recorded', listing: listing.toPublicJSON() })
  } catch (error) {
    console.error('Error processing purchase:', error)
    res.status(500).json({ error: 'Failed to process purchase' })
  }
})

module.exports = router
