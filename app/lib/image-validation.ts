/**
 * Image validation for marketplace/DEX requirements.
 * Icon (token logo): 1:1, min 100px, max 4.5MB, png/jpg/webp/gif
 * Banner/Header: 3:1, min 600px, max 4.5MB, png/jpg/webp/gif
 */

export const ICON_SPEC = {
  aspectRatio: [1, 1] as const,
  minWidth: 100,
  maxSizeBytes: 4.5 * 1024 * 1024,
  formats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
}
export const BANNER_SPEC = {
  aspectRatio: [3, 1] as const,
  minWidth: 600,
  maxSizeBytes: 4.5 * 1024 * 1024,
  formats: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
}

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; error: string }

function isFormatAllowed(type: string): boolean {
  return /^image\/(png|jpeg|jpg|webp|gif)$/i.test(type)
}

export async function validateIconImage(file: File): Promise<ImageValidationResult> {
  if (file.size > ICON_SPEC.maxSizeBytes) {
    return { ok: false, error: `Icon must be under 4.5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)` }
  }
  const allowed = isFormatAllowed(file.type)
  if (!allowed) {
    return { ok: false, error: 'Icon must be PNG, JPG, WebP, or GIF' }
  }
  const dims = await getImageDimensions(file)
  if (!dims) return { ok: false, error: 'Could not read image dimensions' }
  const { width, height } = dims
  if (width < ICON_SPEC.minWidth || height < ICON_SPEC.minWidth) {
    return { ok: false, error: `Icon must be at least 100x100px (current: ${width}x${height})` }
  }
  const ratio = width / height
  const targetRatio = ICON_SPEC.aspectRatio[0] / ICON_SPEC.aspectRatio[1]
  if (Math.abs(ratio - targetRatio) > 0.05) {
    return { ok: false, error: `Icon must be square (1:1). Current: ${width}x${height}. Use 100x100, 512x512, etc.` }
  }
  return { ok: true }
}

export async function validateBannerImage(file: File): Promise<ImageValidationResult> {
  if (file.size > BANNER_SPEC.maxSizeBytes) {
    return { ok: false, error: `Banner must be under 4.5MB` }
  }
  const allowed = isFormatAllowed(file.type)
  if (!allowed) {
    return { ok: false, error: 'Banner must be PNG, JPG, WebP, or GIF' }
  }
  const dims = await getImageDimensions(file)
  if (!dims) return { ok: false, error: 'Could not read image dimensions' }
  const { width, height } = dims
  if (width < BANNER_SPEC.minWidth) {
    return { ok: false, error: `Banner must be at least 600px wide (current: ${width}px)` }
  }
  const ratio = width / height
  const targetRatio = BANNER_SPEC.aspectRatio[0] / BANNER_SPEC.aspectRatio[1]
  if (Math.abs(ratio - targetRatio) > 0.1) {
    return { ok: false, error: `Banner should be 3:1 (e.g. 600x200, 1500x500). Current: ${width}x${height}` }
  }
  return { ok: true }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
