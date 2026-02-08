'use client'

/**
 * Mobile- and PWA-friendly image file input.
 * Uses a native label + overlaid input (no programmatic click) so it works
 * in wallet in-app browsers (Backpack, Phantom, etc.) and WebViews where
 * element.click() on hidden inputs is blocked.
 */
import { cn } from '@/lib/utils'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

export interface ImageFileButtonProps {
  /** For single file. When multiple=true, receives first file only; use onFiles for all. */
  onChange?: (file: File) => void
  /** For multiple files */
  onFiles?: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
  /** Min 44px for touch targets (accessibility) */
  minTouchSize?: boolean
}

export default function ImageFileButton({
  onChange,
  onFiles,
  accept = IMAGE_ACCEPT,
  multiple = false,
  disabled = false,
  children,
  className,
  minTouchSize = true,
}: ImageFileButtonProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) {
      e.target.value = ''
      return
    }
    if (multiple && onFiles) {
      onFiles(imageFiles)
    } else if (onChange) {
      onChange(imageFiles[0])
    }
    e.target.value = ''
  }

  return (
    <label
      className={cn(
        'relative inline-flex cursor-pointer overflow-hidden',
        minTouchSize && 'min-h-[44px] min-w-[44px]',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0 disabled:pointer-events-none"
        aria-label="Upload image"
      />
      {children}
    </label>
  )
}
