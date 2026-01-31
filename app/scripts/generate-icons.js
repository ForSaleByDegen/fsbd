/**
 * Simple script to generate placeholder PWA icons
 * Run with: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp (or use ImageMagick/Canvas)
 * 
 * This creates simple purple gradient icons with $FBSD text
 */

const fs = require('fs')
const path = require('path')

// Simple SVG-based icon generator (no dependencies)
function generateIconSVG(size, text = '$FBSD') {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#660099;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9933ff;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>`
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public')

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Generate SVG icons (can be converted to PNG later)
const icon192 = generateIconSVG(192)
const icon512 = generateIconSVG(512)

fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), icon192)
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), icon512)

console.log('✅ Generated placeholder SVG icons:')
console.log('   - icon-192.svg')
console.log('   - icon-512.svg')
console.log('')
console.log('📝 Note: For PWA, you need PNG files.')
console.log('   Convert SVGs to PNG using:')
console.log('   - Online: https://cloudconvert.com/svg-to-png')
console.log('   - CLI: npm install -g sharp && node scripts/svg-to-png.js')
console.log('   - Or use any image editor to export as PNG')
