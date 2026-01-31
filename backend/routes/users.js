const express = require('express')
const router = express.Router()
const User = require('../models/User')
const crypto = require('crypto')

// Helper to hash wallet address
function hashWalletAddress(address) {
  return crypto.createHash('sha256').update(address).digest('hex')
}

// Get or create user (by wallet hash)
router.get('/me', async (req, res) => {
  try {
    const walletHash = req.headers['x-wallet-address']
    if (!walletHash) {
      return res.status(401).json({ error: 'Wallet address required' })
    }

    let user = await User.findOne({ walletAddressHash: walletHash })
    if (!user) {
      user = new User({ walletAddressHash: walletHash })
      await user.save()
    }

    // Return minimal data (no PII)
    res.json({
      tier: user.tier,
      listingsCount: user.listingsCount,
      totalFeesPaid: user.totalFeesPaid
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
})

module.exports = router
