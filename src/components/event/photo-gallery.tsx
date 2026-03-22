'use client'

import { useState } from 'react'

import { Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { EventPhoto } from '@/types/analytics'

interface PhotoGalleryProps {
  photos: EventPhoto[]
  totalCount?: number
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onDeletePhoto?: (photoId: string) => void | Promise<void>
}

function formatPhotoDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('de-CH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function groupPhotosByDate(photos: EventPhoto[]): Map<string, EventPhoto[]> {
  const groups = new Map<string, EventPhoto[]>()
  for (const photo of photos) {
    const key = formatPhotoDate(photo.createdAt)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(photo)
  }
  return groups
}

export function PhotoGallery({
  photos,
  totalCount,
  isLoadingMore = false,
  onLoadMore,
  onDeletePhoto,
}: PhotoGalleryProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<EventPhoto | null>(null)
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (photos.length === 0) return null

  const groupedPhotos = groupPhotosByDate(photos)
  const hasMore = totalCount !== undefined && totalCount > photos.length

  return (
    <>
      <div className="space-y-4">
        {[...groupedPhotos.entries()].map(([dateLabel, dayPhotos]) => (
          <div key={dateLabel}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {dateLabel}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {dayPhotos.map((photo, index) => {
                const isLastOdd =
                  dayPhotos.length > 1 &&
                  index === dayPhotos.length - 1 &&
                  dayPhotos.length % 2 !== 0
                return (
                  <div
                    key={photo.id}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-xl',
                      dayPhotos.length === 1 && 'col-span-2',
                      isLastOdd && 'col-span-2',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className="size-full"
                    >
                      <img
                        src={photo.signedUrl}
                        alt={`Foto vom ${dateLabel}`}
                        className="size-full object-cover"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </button>
                    {onDeletePhoto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletePhotoId(photo.id)
                        }}
                        aria-label="Foto löschen"
                        className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/50 text-white"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {hasMore && onLoadMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="w-full rounded-xl border border-border py-2.5 text-sm text-muted-foreground transition-colors active:bg-muted disabled:opacity-50"
          >
            {isLoadingMore ? 'Wird geladen...' : 'Ältere laden'}
          </button>
        )}
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

      <AlertDialog
        open={!!deletePhotoId}
        onOpenChange={(open) => {
          if (!open) setDeletePhotoId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foto löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Foto wird dauerhaft gelöscht und kann nicht wiederhergestellt
              werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async () => {
                if (deletePhotoId) {
                  setIsDeleting(true)
                  try {
                    await onDeletePhoto?.(deletePhotoId)
                  } finally {
                    setIsDeleting(false)
                    setDeletePhotoId(null)
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
