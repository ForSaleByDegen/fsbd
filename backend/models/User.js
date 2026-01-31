const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  // Only store hashed wallet address - never store raw addresses
  walletAddressHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Tier info (calculated on-chain, cached here)
  tier: {
    type: String,
    enum: ['free', 'bronze', 'silver', 'gold'],
    default: 'free'
  },
  // Stats (no PII)
  listingsCount: {
    type: Number,
    default: 0
  },
  totalFeesPaid: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('User', userSchema)
