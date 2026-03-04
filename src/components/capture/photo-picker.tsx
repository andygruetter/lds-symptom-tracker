'use client'

import { useEffect, useMemo, useRef } from 'react'

import { Camera, X } from 'lucide-react'

import { cn } from '@/lib/utils'

const MAX_PHOTOS = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB Supabase Bucket Limit

interface PhotoPickerProps {
  pendingPhotos: File[]
  onPhotosSelected: (files: File[]) => void
  onRemovePhoto: (index: number) => void
  disabled?: boolean
  compressImage?: (
    file: File,
    maxWidth: number,
    quality: number,
  ) => Promise<Blob>
}

async function defaultCompressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8,
): Promise<Blob> {
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await new Promise((resolve) => {
    img.onload = resolve
  })

  const canvas = document.createElement('canvas')
  const scale = Math.min(1, maxWidth / img.width)
  canvas.width = img.width * scale
  canvas.height = img.height * scale

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(img.src)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Bild-Komprimierung fehlgeschlagen')),
      'image/jpeg',
      quality,
    ),
  )
}

export function PhotoPicker({
  pendingPhotos,
  onPhotosSelected,
  onRemovePhoto,
  disabled = false,
  compressImage = defaultCompressImage,
}: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remaining = MAX_PHOTOS - pendingPhotos.length
    const selected = Array.from(files).slice(0, remaining)

    const compressed: File[] = []
    for (const file of selected) {
      try {
        const blob = await compressImage(file, 1920, 0.8)
        if (blob.size > MAX_FILE_SIZE) {
          console.warn(
            `[PhotoPicker] ${file.name} zu gross nach Komprimierung (${(blob.size / 1024 / 1024).toFixed(1)}MB), übersprungen`,
          )
          continue
        }
        compressed.push(new File([blob], file.name, { type: 'image/jpeg' }))
      } catch (err) {
        console.warn(
          `[PhotoPicker] Komprimierung fehlgeschlagen für ${file.name}:`,
          err,
        )
      }
    }

    if (compressed.length > 0) {
      onPhotosSelected(compressed)
    }

    // Reset input so same files can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  // Stable blob URLs — create once per file set, revoke on change
  const thumbnailUrls = useMemo(
    () => pendingPhotos.map((file) => URL.createObjectURL(file)),
    [pendingPhotos],
  )

  useEffect(() => {
    return () => {
      thumbnailUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [thumbnailUrls])

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
        aria-label="Fotos hinzufügen"
      />

      {/* Camera button */}
      <button
        type="button"
        onClick={handleCameraClick}
        disabled={disabled || pendingPhotos.length >= MAX_PHOTOS}
        aria-label="Foto aufnehmen"
        className={cn(
          'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground',
          (disabled || pendingPhotos.length >= MAX_PHOTOS) && 'opacity-40',
        )}
      >
        <Camera className="size-5" aria-hidden="true" />
      </button>

      {/* Thumbnail preview bar */}
      {pendingPhotos.length > 0 && (
        <div
          role="list"
          aria-label="Ausgewählte Fotos"
          className="absolute -top-20 left-0 right-0 flex gap-2 bg-background px-4 py-2"
        >
          {pendingPhotos.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              role="listitem"
              className="relative size-16 shrink-0 overflow-hidden rounded-lg"
            >
              <img
                src={thumbnailUrls[index]}
                alt={file.name}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                aria-label={`Foto ${file.name} entfernen`}
                className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
