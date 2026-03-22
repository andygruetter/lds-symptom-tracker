'use client'

import { useCallback, useEffect, useState } from 'react'

import { Camera, ChevronRight, Mic, Pill, X } from 'lucide-react'

import { getFieldLabel } from '@/lib/field-config'
import { cn } from '@/lib/utils'
import type { ExtractedData } from '@/types/ai'
import type { EventPhoto } from '@/types/symptom'

interface ChatBubbleProps {
  variant: 'sent' | 'received' | 'system'
  content?: string
  timestamp?: string
  isProcessing?: boolean
  isMedication?: boolean
  isVoice?: boolean
  isPhoto?: boolean
  photos?: EventPhoto[]
  getSignedUrl?: (storagePath: string) => Promise<string>
  extractedFields?: ExtractedData[]
  isExtractionFailed?: boolean
  isTranscriptionFailed?: boolean
  onRetryExtraction?: () => void
  activeSinceLabel?: string
  durationLabel?: string
  onEndSymptom?: () => void
  eventId?: string
  eventStatus?: string
  onNavigate?: (eventId: string) => void
  onAddPhoto?: (eventId: string) => void
}

function ProcessingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <span className="size-2 animate-pulse rounded-full bg-muted-foreground/50" />
      <span className="size-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
      <span className="size-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
    </div>
  )
}

function getFieldValue(
  fields: ExtractedData[],
  name: string,
): string | undefined {
  return fields.find((f) => f.field_name === name)?.value
}

function groupBySymptomIndex(fields: ExtractedData[]): ExtractedData[][] {
  const groups = new Map<number, ExtractedData[]>()
  for (const field of fields) {
    const idx = field.symptom_index ?? 0
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, fields]) => fields)
}

function formatSymptomTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' })
  const day = date.getDate()
  const month = date.toLocaleDateString('de-CH', { month: 'short' })
  const time = date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${weekday} ${day}. ${month}, ${time}`
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

function getSeverityInfo(value: string): {
  label: string
  colorClass: string
} {
  const num = parseInt(value, 10)
  if (!isNaN(num)) {
    if (num >= 7) return { label: `stark (${num})`, colorClass: 'bg-red-500' }
    if (num >= 4)
      return { label: `mittel (${num})`, colorClass: 'bg-yellow-500' }
    return { label: `leicht (${num})`, colorClass: 'bg-green-500' }
  }
  const lower = value.toLowerCase()
  if (['stark', 'sehr stark', 'unerträglich'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-red-500' }
  if (['mittel', 'mässig', 'moderat'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-yellow-500' }
  if (['leicht', 'schwach', 'gering'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-green-500' }
  return { label: value, colorClass: 'bg-yellow-500' }
}

/** Fields rendered in the structured layout of SingleSymptomSummary */
const STRUCTURED_SYMPTOM_FIELDS = new Set([
  'symptom_name',
  'body_region',
  'side',
  'symptom_type',
  'intensity',
  'symptom_time',
  'duration',
])

function SingleSymptomSummary({ fields }: { fields: ExtractedData[] }) {
  const get = (name: string) => getFieldValue(fields, name)

  const symptomName = get('symptom_name')
  const bodyRegion = get('body_region')
  const side = get('side')
  const symptomType = get('symptom_type')
  const intensity = get('intensity')
  const symptomTime = get('symptom_time')
  const duration = get('duration')

  const locationParts = [bodyRegion, side].filter(Boolean)
  const line1Parts = [...locationParts]
  if (symptomType) line1Parts.push(symptomType)

  const severityInfo = intensity ? getSeverityInfo(intensity) : null

  const formattedTime = symptomTime ? formatSymptomTimestamp(symptomTime) : null
  const formattedDuration = duration ? formatDurationMinutes(duration) : null

  const extraFields = fields.filter(
    (f) => !STRUCTURED_SYMPTOM_FIELDS.has(f.field_name),
  )

  return (
    <div>
      {symptomName && <p className="text-sm font-semibold">{symptomName}</p>}
      <div className="mt-0.5 space-y-0.5">
        {(line1Parts.length > 0 || severityInfo) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {line1Parts.length > 0 && <span>{line1Parts.join(' · ')}</span>}
            {line1Parts.length > 0 && severityInfo && <span>·</span>}
            {severityInfo && (
              <span className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    'inline-block size-1.5 rounded-full',
                    severityInfo.colorClass,
                  )}
                />
                {severityInfo.label}
              </span>
            )}
          </p>
        )}
        {(formattedTime || formattedDuration) && (
          <p className="text-xs text-muted-foreground">
            {[formattedTime, formattedDuration].filter(Boolean).join(' · ')}
          </p>
        )}
        {extraFields.map((f) => (
          <p key={f.id} className="text-xs text-muted-foreground">
            {getFieldLabel(f.field_name)}: {f.value}
          </p>
        ))}
      </div>
    </div>
  )
}

/** Fields shown explicitly in ConfirmedFieldsSummary medication layout */
const STRUCTURED_MEDICATION_FIELDS = new Set([
  'medication_name',
  'action',
  'dosage',
  'reason',
])

function ConfirmedFieldsSummary({
  fields,
  isMedication,
}: {
  fields: ExtractedData[]
  isMedication: boolean
}) {
  if (isMedication) {
    const get = (name: string) => getFieldValue(fields, name)
    const medName = get('medication_name')
    const action = get('action')
    const dosage = get('dosage')
    const reason = get('reason')
    const extraMedFields = fields.filter(
      (f) => !STRUCTURED_MEDICATION_FIELDS.has(f.field_name),
    )

    return (
      <div className="mt-1.5">
        {medName && <p className="text-sm font-semibold">{medName}</p>}
        <div className="mt-1 space-y-0.5">
          {(action || dosage) && (
            <p className="text-xs text-muted-foreground">
              {[action, dosage].filter(Boolean).join(' · ')}
            </p>
          )}
          {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
          {extraMedFields.map((f) => (
            <p key={f.id} className="text-xs text-muted-foreground">
              {getFieldLabel(f.field_name)}: {f.value}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const symptomGroups = groupBySymptomIndex(fields)

  return (
    <div className="mt-1.5 space-y-2">
      {symptomGroups.map((group, i) => (
        <div key={i}>
          {i > 0 && <div className="mb-2 border-t border-border/50" />}
          <SingleSymptomSummary fields={group} />
        </div>
      ))}
    </div>
  )
}

function PhotoThumbnail({
  photo,
  getSignedUrl,
  onTap,
}: {
  photo: EventPhoto
  getSignedUrl?: (storagePath: string) => Promise<string>
  onTap: (url: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const loadUrl = useCallback(async () => {
    if (url || loading || !getSignedUrl) return
    setLoading(true)
    try {
      const signedUrl = await getSignedUrl(photo.storage_path)
      setUrl(signedUrl)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [url, loading, getSignedUrl, photo.storage_path])

  useEffect(() => {
    if (!url && !loading && !error && getSignedUrl) {
      loadUrl()
    }
  }, [url, loading, error, getSignedUrl, loadUrl])

  if (error) {
    return (
      <div className="flex size-16 items-center justify-center rounded-lg bg-muted">
        <Camera className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
    )
  }

  if (loading || !url) {
    return <div className="size-16 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <button
      type="button"
      onClick={() => onTap(url)}
      className="size-16 shrink-0 overflow-hidden rounded-lg shadow-sm"
    >
      <img src={url} alt="Foto" className="size-full object-cover" />
    </button>
  )
}

function PhotoGrid({
  photos,
  getSignedUrl,
}: {
  photos: EventPhoto[]
  getSignedUrl?: (storagePath: string) => Promise<string>
}) {
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)

  const maxVisible = 3
  const visiblePhotos = photos.slice(0, maxVisible)
  const remaining = photos.length - maxVisible

  return (
    <>
      <div className="mt-2 flex gap-1.5">
        {visiblePhotos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            getSignedUrl={getSignedUrl}
            onTap={setFullscreenUrl}
          />
        ))}
        {remaining > 0 && (
          <div className="flex size-16 items-center justify-center rounded-lg bg-muted text-sm font-medium text-muted-foreground">
            +{remaining}
          </div>
        )}
      </div>

      {fullscreenUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setFullscreenUrl(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFullscreenUrl(null)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Foto-Vollansicht"
        >
          <button
            type="button"
            autoFocus
            onClick={(e) => {
              e.stopPropagation()
              setFullscreenUrl(null)
            }}
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
            aria-label="Vollansicht schliessen"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
          <img
            src={fullscreenUrl}
            alt="Foto-Vollansicht"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}

export function ChatBubble({
  variant,
  content,
  timestamp,
  isProcessing = false,
  isMedication = false,
  isVoice = false,
  isPhoto = false,
  photos,
  getSignedUrl,
  extractedFields,
  isExtractionFailed = false,
  isTranscriptionFailed = false,
  onRetryExtraction,
  activeSinceLabel,
  durationLabel,
  onEndSymptom,
  eventId,
  eventStatus,
  onNavigate,
  onAddPhoto,
}: ChatBubbleProps) {
  const isNavigable =
    onNavigate && eventId && eventStatus && eventStatus !== 'pending'

  return (
    <div
      role="article"
      aria-label={timestamp ? `Nachricht vom ${timestamp}` : 'Chat-Nachricht'}
      className={cn(
        'flex',
        variant === 'sent' && 'justify-end',
        variant === 'received' && 'justify-start',
        variant === 'system' && 'justify-center',
      )}
      onClick={isNavigable ? () => onNavigate(eventId) : undefined}
      onKeyDown={
        isNavigable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onNavigate && eventId) onNavigate(eventId)
              }
            }
          : undefined
      }
      tabIndex={isNavigable ? 0 : undefined}
      style={isNavigable ? { cursor: 'pointer' } : undefined}
    >
      <div
        className={cn(
          'relative max-w-[80%] px-4 py-2.5',
          variant === 'sent' &&
            !isMedication &&
            'rounded-2xl rounded-br-sm bg-primary text-primary-foreground',
          variant === 'sent' &&
            isMedication &&
            'rounded-2xl rounded-br-sm bg-teal-600 text-white',
          variant === 'received' &&
            'rounded-2xl rounded-bl-sm bg-card text-card-foreground shadow-sm',
          variant === 'system' && 'rounded-xl bg-muted text-foreground',
          isNavigable && 'pr-8',
        )}
      >
        {isProcessing ? (
          <ProcessingDots />
        ) : isExtractionFailed ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-destructive">
              Extraktion fehlgeschlagen
            </p>
            {onRetryExtraction && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryExtraction()
                }}
                className="text-xs underline"
              >
                Erneut versuchen
              </button>
            )}
          </div>
        ) : isTranscriptionFailed ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-destructive">
              Transkription fehlgeschlagen
            </p>
            {onRetryExtraction && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetryExtraction()
                }}
                className="text-xs underline"
              >
                Erneut versuchen
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-1.5">
              {isMedication && (
                <Pill className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              )}
              {isVoice && !content && (
                <div className="flex items-center gap-1.5">
                  <Mic className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm">Sprachaufnahme</span>
                </div>
              )}
              {isVoice && content && (
                <Mic
                  className="mt-0.5 size-3.5 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              )}
              {isPhoto && !content && (
                <div className="flex items-center gap-1.5">
                  <Camera className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm">Foto</span>
                </div>
              )}
              {isPhoto && content && (
                <Camera
                  className="mt-0.5 size-3.5 shrink-0 opacity-50"
                  aria-hidden="true"
                />
              )}
              {content && <p className="text-sm">{content}</p>}
            </div>
            {photos && photos.length > 0 && (
              <PhotoGrid photos={photos} getSignedUrl={getSignedUrl} />
            )}
            {extractedFields && extractedFields.length > 0 && (
              <ConfirmedFieldsSummary
                fields={extractedFields}
                isMedication={isMedication}
              />
            )}
            {activeSinceLabel && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs text-success">
                  {activeSinceLabel}
                </span>
                {onEndSymptom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEndSymptom()
                    }}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
                  >
                    Symptom beendet
                  </button>
                )}
              </div>
            )}
            {durationLabel && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  Dauer: {durationLabel}
                </span>
              </div>
            )}
            {timestamp && (
              <div className="mt-1 flex items-center gap-1.5">
                <p
                  className={cn(
                    'text-xs',
                    variant === 'sent'
                      ? isMedication
                        ? 'text-white/70'
                        : 'text-primary-foreground/70'
                      : 'text-muted-foreground',
                  )}
                >
                  {timestamp}
                </p>
                {onAddPhoto && eventId && eventStatus === 'confirmed' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddPhoto(eventId)
                    }}
                    aria-label="Foto hinzufügen"
                    className={cn(
                      'flex items-center justify-center rounded-full p-0.5',
                      variant === 'sent'
                        ? isMedication
                          ? 'text-white/70'
                          : 'text-primary-foreground/70'
                        : 'text-muted-foreground',
                    )}
                  >
                    <Camera className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {isNavigable && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <ChevronRight
                  className="size-4 text-muted-foreground/50"
                  aria-hidden="true"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
