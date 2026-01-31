# Public Assets Required

This directory should contain the following files for the PWA to work fully:

## Required Icon Files

1. **favicon.ico** - Browser tab icon (16x16 + 32x32 multi-res)
   - Generate from logo using RealFaviconGenerator
   - Place in: `/public/favicon.ico`

2. **icon-192.png** - App icon 192x192px
   - Standard Android home screen icon
   - Purple theme (#660099) with degen/Craigslist aesthetic
   - Place in: `/public/icon-192.png`

3. **icon-512.png** - App icon 512x512px
   - High-res version for PWA
   - Same design as icon-192, larger size
   - Place in: `/public/icon-512.png`

4. **maskable-icon-192.png** - Maskable icon 192x192px
   - Content must be in inner 80% circle (safe area)
   - Outer 20% can be cropped by Android
   - Place in: `/public/maskable-icon-192.png`

5. **maskable-icon-512.png** - Maskable icon 512x512px
   - High-res maskable version
   - Safe area design (inner 80%)
   - Place in: `/public/maskable-icon-512.png`

6. **apple-touch-icon.png** - iOS icon 180x180px
   - For iOS home screen
   - Place in: `/public/apple-touch-icon.png`

## Audio Files

7. **party-horn.mp3** - Short party horn sound effect (<200KB)
   - Download from: https://pixabay.com/sound-effects/search/party-horn/
   - Or use: https://bigsoundbank.com/UPLOAD/mp3/1556.mp3
   - Place in: `/public/party-horn.mp3`

## Optional Files

8. **background.jpg** (optional) - Full-screen background image
   - 1920x1080 or larger
   - Seamless tiling, dark with purple grid
   - Place in: `/public/background.jpg`

9. **fallback-audio.mp3** (optional) - Silent placeholder for offline fallback
   - Can be a very short silent MP3
   - Place in: `/public/fallback-audio.mp3`

10. **fallback-placeholder.png** (optional) - Placeholder image for offline
    - Simple 1x1 transparent or "offline" message image
    - Place in: `/public/fallback-placeholder.png`

## Logo Generation

See `LOGO_GENERATION_GUIDE.md` in the root directory for:
- Ready-to-use prompts for Midjourney/Flux/Leonardo
- Icon generation instructions
- Maskable icon design guidelines
- Testing checklist

## Quick Setup

1. **Generate logo** using prompts in `LOGO_GENERATION_GUIDE.md`
2. **Use RealFaviconGenerator**: https://realfavicongenerator.net/favicon-generator/nextjs
3. **Upload your 512x512 logo** → configure maskable icons
4. **Download zip** → extract all files to `app/public/`
5. **Rebuild**: `npm run build`

## Notes

- The app will work without these files, but:
  - Easter egg won't play sound without party-horn.mp3
  - PWA won't have proper icons without icon files
  - Browser tab won't show favicon without favicon.ico
  - Offline fallbacks won't work without fallback files

- For quick testing, you can use placeholder images/icons temporarily.
- The manifest.ts file is already configured - just add the icon files!
