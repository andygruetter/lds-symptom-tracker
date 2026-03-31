'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ArrowLeft, Trash2 } from 'lucide-react'

import { PhotoPicker } from '@/components/capture/photo-picker'
import { DeleteEventDialog } from '@/components/event/delete-event-dialog'
import {
  AudioSection,
  EventTypeBadge,
  ExtractedDataSection,
  RawInputSection,
} from '@/components/event/event-detail-sections'
import { formatDateTime } from '@/components/event/event-detail-utils'
import { PhotoGallery } from '@/components/event/photo-gallery'
import {
  addPhotosToEvent,
  deleteEventPhoto,
  loadMoreEventPhotos,
} from '@/lib/actions/symptom-actions'
import type { EventDetail, EventPhoto } from '@/types/analytics'

function EventPhotoUploader({
  eventId,
  autoOpen = false,
  onUploaded,
}: {
  eventId: string
  autoOpen?: boolean
  onUploaded: () => void
}) {
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleUpload = async () => {
    if (pendingPhotos.length === 0 || isUploading) return
    setIsUploading(true)
    setUploadError(null)
    const formData = new FormData()
    formData.append('eventId', eventId)
    for (const photo of pendingPhotos) {
      formData.append('photos', photo)
    }
    try {
      const result = await addPhotosToEvent(formData)
      if (result.error) {
        setUploadError(result.error.error)
        return
      }
      setPendingPhotos([])
      onUploaded()
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload fehlgeschlagen',
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="mt-3">
      <PhotoPicker
        pendingPhotos={pendingPhotos}
        onPhotosSelected={(files) => {
          setUploadError(null)
          setPendingPhotos((prev) => [...prev, ...files])
        }}
        onRemovePhoto={(index) =>
          setPendingPhotos((prev) => prev.filter((_, i) => i !== index))
        }
        autoOpen={autoOpen}
        disabled={isUploading}
      />
      {uploadError && (
        <p className="mt-2 text-sm text-destructive">{uploadError}</p>
      )}
      {pendingPhotos.length > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {isUploading
            ? 'Wird hochgeladen...'
            : `${pendingPhotos.length} Foto${pendingPhotos.length !== 1 ? 's' : ''} speichern`}
        </button>
      )}
    </div>
  )
}

interface EventDetailViewProps {
  detail: EventDetail
  addPhoto?: boolean
}

export function EventDetailView({
  detail,
  addPhoto = false,
}: EventDetailViewProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [photos, setPhotos] = useState<EventPhoto[]>(detail.photos)
  const [photoOffset, setPhotoOffset] = useState(detail.photos.length)
  const [totalPhotoCount, setTotalPhotoCount] = useState(detail.totalPhotoCount)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Sync state when server re-renders after router.refresh()
  useEffect(() => {
    setPhotos(detail.photos)
    setPhotoOffset(detail.photos.length)
    setTotalPhotoCount(detail.totalPhotoCount)
  }, [detail.photos, detail.totalPhotoCount])

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/insights')
    }
  }

  const isMedication = detail.eventType === 'medication'
  const { combined: dateTime } = formatDateTime(detail.occurredAt)

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors active:bg-muted/80"
          aria-label="Zurück"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">
          Event-Details
        </h1>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="flex size-11 items-center justify-center rounded-full text-destructive transition-colors active:bg-muted"
          aria-label="Event löschen"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Typ + Datum */}
          <div className="flex items-center justify-between gap-2">
            <EventTypeBadge
              eventType={detail.eventType}
              endedAt={detail.endedAt}
              occurredAt={detail.occurredAt}
            />
            <span className="text-sm text-muted-foreground">{dateTime}</span>
          </div>

          <RawInputSection rawInput={detail.rawInput} />

          <AudioSection audioUrl={detail.audioUrl} />

          <ExtractedDataSection
            extractedFields={detail.extractedFields}
            eventType={detail.eventType}
          />

          {/* Fotos — patient view with upload/delete/load-more */}
          <div>
            {photos.length > 0 && (
              <>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Fotos ({totalPhotoCount})
                </p>
                <PhotoGallery
                  photos={photos}
                  totalCount={totalPhotoCount}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={async () => {
                    setIsLoadingMore(true)
                    try {
                      const result = await loadMoreEventPhotos(
                        detail.id,
                        photoOffset,
                      )
                      if (result.data && result.data.length > 0) {
                        setPhotos((prev) => [...prev, ...result.data!])
                        setPhotoOffset((prev) => prev + result.data!.length)
                      }
                    } finally {
                      setIsLoadingMore(false)
                    }
                  }}
                  onDeletePhoto={async (photoId) => {
                    const result = await deleteEventPhoto(photoId)
                    if (!result.error) {
                      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
                      setTotalPhotoCount((prev) => prev - 1)
                    }
                  }}
                />
              </>
            )}
            {(detail.eventStatus === 'confirmed' ||
              detail.eventStatus === 'extraction_failed') && (
              <EventPhotoUploader
                eventId={detail.id}
                autoOpen={addPhoto}
                onUploaded={() => router.refresh()}
              />
            )}
          </div>

          {/* Re-Run Buttons — nur wenn bereits verarbeitet */}
          {(detail.eventStatus === 'extracted' ||
            detail.eventStatus === 'confirmed') && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={isRetrying}
                onClick={async () => {
                  setIsRetrying(true)
                  try {
                    await fetch('/api/ai/extract', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        symptomEventId: detail.id,
                        mode: 'extract',
                      }),
                    })
                    router.refresh()
                  } finally {
                    setIsRetrying(false)
                  }
                }}
                className="flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors active:bg-muted disabled:opacity-50"
              >
                {isRetrying ? 'Wird verarbeitet...' : 'Extraktion wiederholen'}
              </button>
              {detail.audioUrl && (
                <button
                  type="button"
                  disabled={isRetrying}
                  onClick={async () => {
                    setIsRetrying(true)
                    try {
                      await fetch('/api/ai/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          symptomEventId: detail.id,
                          mode: 'transcribe',
                        }),
                      })
                      router.refresh()
                    } finally {
                      setIsRetrying(false)
                    }
                  }}
                  className="flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors active:bg-muted disabled:opacity-50"
                >
                  {isRetrying
                    ? 'Wird verarbeitet...'
                    : 'Transkription wiederholen'}
                </button>
              )}
            </div>
          )}

          {/* Bearbeiten-Link — nur für Symptom-Events */}
          {!isMedication && (
            <div className="flex justify-center">
              <Link
                href={`/event/${detail.id}/edit`}
                className="flex h-11 items-center rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-colors active:bg-muted"
              >
                Bearbeiten
              </Link>
            </div>
          )}

          <div className="h-4" aria-hidden="true" />
        </div>
      </div>

      <DeleteEventDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        eventId={detail.id}
      />
    </div>
  )
}
