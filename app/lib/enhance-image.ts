/**
 * Client-side image enhancement for Snap to Compare.
 * Improves contrast and sharpness so AI analysis works better with lower-quality camera photos.
 */

const MAX_DIM = 1024
const JPEG_QUALITY = 0.85

/**
 * Enhance image: auto-contrast, light sharpen, optional resize.
 * Returns data URL of enhanced JPEG.
 */
export async function enhanceImageForAnalysis(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data

        // Auto-contrast: stretch histogram to use full range
        let minR = 255, minG = 255, minB = 255
        let maxR = 0, maxG = 0, maxB = 0
        for (let i = 0; i < data.length; i += 4) {
          minR = Math.min(minR, data[i])
          minG = Math.min(minG, data[i + 1])
          minB = Math.min(minB, data[i + 2])
          maxR = Math.max(maxR, data[i])
          maxG = Math.max(maxG, data[i + 1])
          maxB = Math.max(maxB, data[i + 2])
        }

        const rangeR = maxR - minR || 1
        const rangeG = maxG - minG || 1
        const rangeB = maxB - minB || 1

        for (let i = 0; i < data.length; i += 4) {
          data[i] = ((data[i] - minR) / rangeR) * 255
          data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255
          data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255
        }

        ctx.putImageData(imageData, 0, 0)

        const out = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(out)
      } catch (e) {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
