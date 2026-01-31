# Logo Generation Guide for For Sale By Degen ($FBSD)

## 🎨 Logo Style Options

Choose one of these prompts and generate 3-5 variants, then pick the best one.

### 1. Classic Craigslist Text + Degen Twist (Most Nostalgic & Simple)
```
retro 1990s Craigslist logo parody for crypto project "For Sale By Degen", lowercase serif text "for sale by degen" in deep Craigslist purple #660099 on plain white or black background, small $FBSD ticker in monospace superscript, tiny sad Pepe frog peeking from pixelated back door on the right, Solana rocket emoji and faint meme coin chaos, low-res brutalist web aesthetic, no modern polish, nostalgic early internet classifieds look, square aspect ratio --ar 1:1 --stylize 150 --v 6
```

### 2. Pepe-Centered Degen Version (Viral Meme Potential)
```
degen Pepe the Frog as Craigslist seller, green frog wearing backwards cap labeled $FBSD, sunglasses with laser eyes, sitting at old CRT monitor displaying purple Craigslist-style page with Solana logos and shitcoin tickers, chaotic background with raining meme coins and purple links, retro 90s web brutalism, pixel art elements, underground hacker vibe, text "FOR SALE BY DEGEN" arched above in distressed serif purple #660099, square logo style, high contrast --ar 1:1 --stylize 250
```

### 3. Back Door Literal + Minimal Stamp
```
minimalist brutalist logo for "For Sale By Degen", pixelated open back door leading into darkness with purple Craigslist text spilling out ("shitcoins wanted", "degen gigs", "anon swaps"), tiny Pepe frog silhouette inside door, $FBSD in bold monospace below, deep purple #660099 and hot pink accents on black background, faint HTML table grid lines, 90s underground hacker aesthetic, square format, no gradients --ar 1:1 --stylize 100
```

### 4. Neon Glitch Chaos (Most Aggressive Degen Energy)
```
cyberpunk glitch logo "FOR SALE BY DEGEN $FBSD", purple Craigslist serif text with heavy RGB split glitch effect, neon glow shadows cyan/magenta/yellow, background black with faint matrix green code rain and purple grid, Pepe frog face distorted in glitch, Solana sun rising behind, chaotic 90s Geocities meets degen meme style, square, intense distortion --ar 1:1 --stylize 400
```

## 📐 Required Icon Sizes

After generating your logo, create these sizes:

### Standard Icons
- **favicon.ico** - 16x16 + 32x32 multi-resolution (use favicon generator)
- **icon-192.png** - 192x192px
- **icon-512.png** - 512x512px
- **apple-touch-icon.png** - 180x180px (iOS)

### Maskable Icons (for Android/Saga)
- **maskable-icon-192.png** - 192x192px with safe area (content in inner 80% circle)
- **maskable-icon-512.png** - 512x512px with safe area

## 🛠️ Tools for Icon Generation

### Option 1: RealFaviconGenerator (Recommended)
1. Go to: https://realfavicongenerator.net/favicon-generator/nextjs
2. Upload your 512x512 logo
3. Configure:
   - Android Chrome: Use maskable icons
   - iOS: Enable Apple touch icon
   - Theme color: `#660099`
  4. Download zip and extract to `app/public/`

### Option 2: Favicon.io
1. Go to: https://favicon.io/favicon-generator/
2. Upload your logo
3. Download and rename files to match requirements

### Option 3: Manual (Using Image Editor)
1. Start with 512x512px logo
2. Export at each size needed
3. For maskable: Ensure important content is within inner 80% circle (outer 20% can be cropped)

## 📁 File Placement

Place all icons in `app/public/`:
```
app/public/
├── favicon.ico
├── icon-192.png
├── icon-512.png
├── maskable-icon-192.png
├── maskable-icon-512.png
└── apple-touch-icon.png
```

## 🎨 Background Image (Optional)

If you want a full-screen background image:

### Generate Background Version
Add to your chosen logo prompt:
```
[your chosen logo prompt] but as seamless tiling background, dark black with faint purple grid and subtle glitch noise, low opacity elements, cyberpunk underground web aesthetic, high resolution --ar 16:9 --stylize 200
```

### Save as:
- `app/public/background.jpg` (1920x1080 or larger)

Then add to `app/app/globals.css`:
```css
.background-image {
  position: fixed;
  inset: 0;
  background: url('/background.jpg') center/cover no-repeat fixed;
  opacity: 0.15;
  z-index: -10;
  pointer-events: none;
}
```

And add to `app/app/layout.tsx`:
```tsx
<div className="background-image" />
```

## ✅ Testing Checklist

After adding icons:
1. Run `npm run build`
2. Check browser tab favicon appears
3. Test PWA install (Chrome → Install app)
4. Verify home screen icon on Android
5. Check maskable icon crops correctly (outer edges may be cut)
6. Test on Solana Saga device if available

## 🚀 Quick Start

1. **Pick a prompt** from above (recommend #1 or #3 for simplicity)
2. **Generate 3-5 variants** in Midjourney/Flux/Leonardo
3. **Pick the winner** → export as 512x512 PNG
4. **Run through RealFaviconGenerator** → download zip
5. **Extract to `app/public/`** → rebuild and test

The manifest.ts file is already set up - just add the icon files!
