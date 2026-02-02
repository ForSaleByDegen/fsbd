/**
 * Strip EXIF and all embedded metadata from images before upload.
 * Images can contain GPS coordinates, camera info, timestamps, and other PII.
 * Re-encoding via canvas produces a clean image with no metadata.
 * Runs client-side only (browser).
 */
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function getOutputType(inputType: string): string {
  if (inputType === 'image/png') return 'image/png'
  if (inputType === 'image/webp') return 'image/webp'
  if (inputType === 'image/gif') return 'image/gif'
  return 'image/jpeg'
}

function getExtension(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

/**
 * Strip all metadata (EXIF, XMP, etc.) from an image file.
 * Uses canvas re-encoding - produces a clean image. No GPS, camera info, or timestamps.
 * @param file - Original image file
 * @returns New File with metadata stripped, or original if stripping fails/unsupported
 */
export async function stripImageMetadata(file: File): Promise<File> {
  // Server-side: return as-is (stripping happens client-side before upload)
  if (typeof window === 'undefined') return file
  if (!file.type || !SUPPORTED_TYPES.includes(file.type)) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }
        ctx.drawImage(img, 0, 0)
        const outputType = getOutputType(file.type)
        const quality = outputType === 'image/jpeg' ? 0.92 : undefined
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const ext = getExtension(outputType)
            const safeName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image'
            const newFile = new File([blob], `${safeName}.${ext}`, {
              type: outputType,
              lastModified: Date.now(),
            })
            resolve(newFile)
          },
          outputType,
          quality
        )
      } catch (e) {
        resolve(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}

/**
 * Strip metadata from multiple image files.
 */
export async function stripImageMetadataBatch(files: File[]): Promise<File[]> {
  return Promise.all(files.map(stripImageMetadata))
}
