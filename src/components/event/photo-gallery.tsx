'use client'

import { useState } from 'react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { EventPhoto } from '@/types/analytics'

interface PhotoGalleryProps {
  photos: EventPhoto[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<EventPhoto | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, index) => {
          const isLastOdd =
            photos.length > 1 &&
            index === photos.length - 1 &&
            photos.length % 2 !== 0
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxPhoto(photo)}
              className={cn(
                'aspect-square overflow-hidden rounded-xl',
                photos.length === 1 && 'col-span-2',
                isLastOdd && 'col-span-2',
              )}
            >
              <img
                src={photo.signedUrl}
                alt={`Foto ${index + 1}`}
                className="size-full object-cover"
                onContextMenu={(e) => e.preventDefault()}
              />
            </button>
          )
        })}
      </div>

      <Dialog
        open={!!lightboxPhoto}
        onOpenChange={(open) => {
          if (!open) setLightboxPhoto(null)
        }}
      >
        <DialogContent className="max-w-screen-sm p-2">
          <DialogTitle className="sr-only">Foto vergrössert</DialogTitle>
          {lightboxPhoto && (
            <img
              src={lightboxPhoto.signedUrl}
              alt="Foto vergrössert"
              className="w-full rounded-lg object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
