'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ArrowLeft, Trash2 } from 'lucide-react'

import { PhotoPicker } from '@/components/capture/photo-picker'
import { AudioPlayer } from '@/components/event/audio-player'
import { DeleteEventDialog } from '@/components/event/delete-event-dialog'
import { PhotoGallery } from '@/components/event/photo-gallery'
import {
  FIELD_LABELS,
  getFieldLabel,
  sortByFieldOrder,
} from '@/lib/field-config'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils/duration'
import type { EventDetail, EventPhoto, ExtractedField } from '@/types/analytics'
import {
  addPhotosToEvent,
  deleteEventPhoto,
  loadMoreEventPhotos,
} from '@/lib/actions/symptom-actions'

/** Fields that belong to the whole event, not per-symptom group */
const EVENT_LEVEL_FIELDS = new Set(['symptom_time', 'duration'])

function groupBySymptomIndex(
  fields: ExtractedField[],
): Map<number, ExtractedField[]> {
  const groups = new Map<number, ExtractedField[]>()
  for (const field of fields) {
    const idx = field.symptomIndex ?? 0
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return groups
}

function formatSymptomTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDurationMinutes(minutesStr: string): string | null {
  const minutes = parseInt(minutesStr, 10)
  if (isNaN(minutes) || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`
  if (hours > 0) return `${hours} Std.`
  return `${minutes} Min.`
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'bg-green-500'
  if (confidence >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString))
}

function formatFieldValue(field: ExtractedField): string {
  if (!field.value) return 'Nicht erfasst'
  if (field.fieldName === 'intensity') return `${field.value}/10`
  if (field.fieldName === 'symptom_time')
    return formatSymptomTimestamp(field.value)
  if (field.fieldName === 'duration')
    return formatDurationMinutes(field.value) ?? field.value
  return field.value
}

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

  const symptomGroups = isMedication
    ? null
    : groupBySymptomIndex(detail.extractedFields)
  const sortedGroupKeys = symptomGroups
    ? [...symptomGroups.keys()].sort((a, b) => a - b)
    : []
  const isMultiSymptom = sortedGroupKeys.length > 1

  // All fields with a value, sorted by FIELD_ORDER
  const fieldMap = new Map(detail.extractedFields.map((f) => [f.fieldName, f]))
  const displayFields = sortByFieldOrder(
    detail.extractedFields.filter((f) => !!f.value).map((f) => f.fieldName),
  )
    .map((name) => fieldMap.get(name)!)
    .filter(Boolean)

  const typeBadgeColor = isMedication ? '#4A7FA5' : '#C06A3C'
  const typeLabel = isMedication ? 'Medikament' : 'Symptom'

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
        {/* Typ + Datum/Uhrzeit */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: typeBadgeColor }}
          >
            <span
              className="size-2 rounded-full bg-white/70"
              aria-hidden="true"
            />
            {typeLabel}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(detail.occurredAt)}
          </span>
        </div>

        {/* Dauer */}
        {detail.endedAt && (
          <p className="mb-4 text-sm text-muted-foreground">
            Dauer:{' '}
            {formatDuration(
              new Date(detail.occurredAt),
              new Date(detail.endedAt),
            )}
          </p>
        )}

        {/* Ursprüngliche Meldung / Transkription */}
        {detail.rawInput && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Ursprüngliche Meldung
            </p>
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-sm text-foreground">{detail.rawInput}</p>
            </div>
          </div>
        )}

        {/* Audio-Aufnahme */}
        {detail.audioUrl && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              🔊 Audio-Aufnahme
            </p>
            <AudioPlayer audioUrl={detail.audioUrl} />
          </div>
        )}

        {/* Fotos */}
        <div className="mb-5">
          {photos.length > 0 && (
            <>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                📷 Fotos ({totalPhotoCount})
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

        {/* Extrahierte Daten */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Extrahierte Daten
          </h2>
          {isMultiSymptom ? (
            <div className="space-y-4">
              {/* Per-symptom cards */}
              {sortedGroupKeys.map((groupIdx, i) => {
                const groupFields = symptomGroups!.get(groupIdx)!
                const groupFieldMap = new Map(
                  groupFields.map((f) => [f.fieldName, f]),
                )
                const symptomName =
                  groupFieldMap.get('symptom_name')?.value ?? `Symptom ${i + 1}`
                const symptomNameConf =
                  groupFieldMap.get('symptom_name')?.confidence ?? null

                // Show all per-symptom fields with values, excluding event-level and title
                const perSymptomFieldNames = sortByFieldOrder(
                  groupFields
                    .filter(
                      (f) =>
                        !!f.value &&
                        f.fieldName !== 'symptom_name' &&
                        !EVENT_LEVEL_FIELDS.has(f.fieldName),
                    )
                    .map((f) => f.fieldName),
                )
                const filledFields = perSymptomFieldNames
                  .map((name) => groupFieldMap.get(name)!)
                  .filter(Boolean)

                return (
                  <div
                    key={groupIdx}
                    className="rounded-xl border border-border"
                  >
                    {/* Symptom header */}
                    <div className="flex items-center gap-2 px-4 py-3">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#C06A3C]/10 text-xs font-semibold text-[#C06A3C]">
                        {i + 1}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {symptomName}
                      </span>
                      {symptomNameConf !== null && (
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            getConfidenceColor(symptomNameConf),
                          )}
                          title={`Konfidenz: ${Math.round(symptomNameConf)}%`}
                          aria-label={`Konfidenz ${Math.round(symptomNameConf)}%`}
                        />
                      )}
                    </div>
                    {/* Detail fields — only filled ones */}
                    {filledFields.length > 0 && (
                      <div className="divide-y divide-border border-t border-border">
                        {filledFields.map((field) => (
                          <div
                            key={`${groupIdx}-${field.fieldName}`}
                            className="flex items-center justify-between px-4 py-2.5"
                          >
                            <span className="text-xs text-muted-foreground">
                              {getFieldLabel(field.fieldName)}
                            </span>
                            <div className="flex items-center gap-2">
                              {field.confidence !== null && (
                                <span
                                  className={cn(
                                    'size-2 rounded-full',
                                    getConfidenceColor(field.confidence),
                                  )}
                                  title={`Konfidenz: ${Math.round(field.confidence)}%`}
                                  aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                                />
                              )}
                              <span className="text-sm text-foreground">
                                {formatFieldValue(field)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Event-level fields (Zeitpunkt & Dauer) — once for the whole event */}
              {(() => {
                const firstGroup = symptomGroups!.get(sortedGroupKeys[0])!
                const sharedFieldMap = new Map(
                  firstGroup.map((f) => [f.fieldName, f]),
                )
                const filledShared = sortByFieldOrder(
                  firstGroup
                    .filter(
                      (f) => !!f.value && EVENT_LEVEL_FIELDS.has(f.fieldName),
                    )
                    .map((f) => f.fieldName),
                )
                  .map((name) => sharedFieldMap.get(name)!)
                  .filter((f): f is ExtractedField => !!f)

                if (filledShared.length === 0) return null

                return (
                  <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {filledShared.map((field) => (
                      <div
                        key={field.fieldName}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {getFieldLabel(field.fieldName)}
                        </span>
                        <div className="flex items-center gap-2">
                          {field.confidence !== null && (
                            <span
                              className={cn(
                                'size-2 rounded-full',
                                getConfidenceColor(field.confidence),
                              )}
                              title={`Konfidenz: ${Math.round(field.confidence)}%`}
                              aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                            />
                          )}
                          <span className="text-sm text-foreground">
                            {formatFieldValue(field)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {displayFields.map((field) => (
                <div
                  key={field.fieldName}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {getFieldLabel(field.fieldName)}
                  </span>
                  <div className="flex items-center gap-2">
                    {field.confidence !== null && (
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          getConfidenceColor(field.confidence),
                        )}
                        title={`Konfidenz: ${Math.round(field.confidence)}%`}
                        aria-label={`Konfidenz ${Math.round(field.confidence)}%`}
                      />
                    )}
                    <span className="text-sm text-foreground">
                      {formatFieldValue(field)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bearbeiten-Link — nur für Symptom-Events */}
        {!isMedication && (
          <div className="mb-4 flex justify-center">
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

      <DeleteEventDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        eventId={detail.id}
      />
    </div>
  )
}
