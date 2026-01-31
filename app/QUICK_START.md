# Quick Start Guide - Retro UI & PWA Setup

## 🚀 Installation

```bash
cd app
npm install
```

## 📦 Generate Icons (Optional but Recommended)

### Option 1: Use the Script (Requires Node.js)
```bash
# Generate SVG icons
node scripts/generate-icons.js

# Convert to PNG (requires: npm install sharp)
npm install sharp
node scripts/svg-to-png.js
```

### Option 2: Manual Creation
Create `icon-192.png` and `icon-512.png` in `app/public/`:
- Size: 192x192px and 512x512px
- Design: Purple gradient (#660099 to #9933ff) with "$FBSD" text
- Format: PNG with transparency

### Option 3: Use Online Tools
- Generate icons: https://realfavicongenerator.net/
- Convert SVG to PNG: https://cloudconvert.com/svg-to-png

## 🔊 Add Sound Effect

Download `party-horn.mp3` (<200KB) and place in `app/public/`:
- Source: https://pixabay.com/sound-effects/search/party-horn/
- Or: https://bigsoundbank.com/UPLOAD/mp3/1556.mp3

## ✅ Test Locally

```bash
npm run dev
```

### Test Checklist:
1. ✅ App loads without errors
2. ✅ ASCII logo displays on homepage
3. ✅ Windows 95 modal shows when wallet not connected
4. ✅ Type "craigslist" anywhere → confetti + sound + haptic
5. ✅ Loading screen appears during Suspense fallback
6. ✅ Matrix rain background visible
7. ✅ All animations work smoothly

## 🏗️ Build for Production

```bash
npm run build
```

Check that:
- Service worker is generated: `app/public/sw.js`
- Manifest is accessible: `app/public/manifest.json`
- No build errors

## 📱 Test PWA Features

### Desktop (Chrome):
1. Open DevTools → Application → Service Workers
2. Check "Offline" → Reload page
3. Verify cached assets load

### Android:
1. Open site in Chrome
2. Menu → "Add to Home Screen"
3. Install PWA
4. Test offline mode
5. Test haptic feedback (type "craigslist")

## 🎨 Available CSS Classes

Use these anywhere in your components:

```tsx
// Blinking text
<span className="geocities-blink">DEGEN ONLY</span>

// Horizontal marquee
<div className="marquee-container">
  <div className="marquee-content">Scrolling text...</div>
</div>

// Vertical marquee
<div className="vertical-marquee-wrapper">
  <div className="vertical-marquee-track">
    <div className="vertical-marquee-item">Line 1</div>
    <div className="vertical-marquee-item">Line 2</div>
  </div>
</div>

// Typewriter effect
<div className="typewriter">Typing text...</div>

// Neon spinner
<div className="neon-spinner"></div>

// Glitch text
<h1 className="glitch-text" data-text="FOR SALE BY DEGEN">
  FOR SALE BY DEGEN
</h1>
```

## 🐛 Troubleshooting

### Icons not showing in PWA:
- Ensure `icon-192.png` and `icon-512.png` exist in `public/`
- Check `manifest.json` paths are correct
- Clear browser cache

### Sound not playing:
- Check `party-horn.mp3` exists in `public/`
- Browser may block autoplay (typing "craigslist" counts as user interaction)
- Check browser console for errors

### Service worker not registering:
- Ensure `next-pwa` is installed
- Check `next.config.js` has `withPWA` wrapper
- Build in production mode: `npm run build`
- Service worker disabled in development by default

### Haptic not working:
- Android: Requires `navigator.vibrate` support
- iOS: Requires `ios-haptics` package (may not work in all browsers)
- Falls back gracefully if not available

## 📝 Next Steps

1. ✅ Install dependencies
2. ✅ Generate/add icons
3. ✅ Add sound file
4. ✅ Test locally
5. ✅ Build and deploy
6. ✅ Test on Android/Saga device

All components are ready to use! 🎉
