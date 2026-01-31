/**
 * Convert SVG icons to PNG
 * Requires: npm install sharp
 * Run: node scripts/svg-to-png.js
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')

async function convertSVGtoPNG() {
  try {
    // Convert icon-192.svg to icon-192.png
    if (fs.existsSync(path.join(publicDir, 'icon-192.svg'))) {
      await sharp(path.join(publicDir, 'icon-192.svg'))
        .resize(192, 192)
        .png()
        .toFile(path.join(publicDir, 'icon-192.png'))
      console.log('✅ Created icon-192.png')
    }

    // Convert icon-512.svg to icon-512.png
    if (fs.existsSync(path.join(publicDir, 'icon-512.svg'))) {
      await sharp(path.join(publicDir, 'icon-512.svg'))
        .resize(512, 512)
        .png()
        .toFile(path.join(publicDir, 'icon-512.png'))
      console.log('✅ Created icon-512.png')
    }

    console.log('')
    console.log('🎉 PNG icons ready for PWA!')
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp not installed')
      console.log('   Install with: npm install sharp')
    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

convertSVGtoPNG()
