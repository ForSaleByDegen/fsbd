const mongoose = require('mongoose')
const crypto = require('crypto')

// Encryption helper
function encrypt(text) {
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText) {
  const algorithm = 'aes-256-cbc'
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8').slice(0, 32)
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  category: {
    type: String,
    required: true,
    enum: ['for-sale', 'services', 'gigs', 'housing', 'community', 'jobs']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  priceToken: {
    type: String,
    default: 'SOL',
    enum: ['SOL', 'USDC']
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v)
      },
      message: 'Images must be valid URLs'
    }
  }],
  // Encrypted/hashed wallet address for privacy
  walletAddressHash: {
    type: String,
    required: true,
    index: true
  },
  // Public wallet address (needed for payments, but can be hashed in queries)
  walletAddress: {
    type: String,
    required: true
  },
  // Token launch info
  hasToken: {
    type: Boolean,
    default: false
  },
  tokenMint: {
    type: String,
    default: null
  },
  tokenName: {
    type: String,
    default: null
  },
  tokenSymbol: {
    type: String,
    default: null
  },
  // Payment info
  feePaid: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'expired', 'removed'],
    default: 'active'
  },
  // Purchase info (encrypted)
  buyerWalletHash: {
    type: String,
    default: null
  }
}, {
  timestamps: true
})

// Indexes for search
listingSchema.index({ title: 'text', description: 'text' })
listingSchema.index({ category: 1, status: 1 })
listingSchema.index({ createdAt: -1 })

// Virtual for formatted price
listingSchema.virtual('formattedPrice').get(function() {
  return `${this.price} ${this.priceToken}`
})

// Pre-save: Hash wallet address
listingSchema.pre('save', function(next) {
  if (this.isModified('walletAddress')) {
    const crypto = require('crypto')
    this.walletAddressHash = crypto.createHash('sha256').update(this.walletAddress).digest('hex')
  }
  next()
})

// Method to sanitize output (remove sensitive data)
listingSchema.methods.toPublicJSON = function() {
  const obj = this.toObject()
  // Don't expose wallet addresses in public listings
  delete obj.walletAddressHash
  delete obj.buyerWalletHash
  return obj
}

module.exports = mongoose.model('Listing', listingSchema)
