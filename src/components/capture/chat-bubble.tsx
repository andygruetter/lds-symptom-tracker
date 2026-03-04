'use client'

import { useCallback, useEffect, useState } from 'react'

import { Camera, Mic, Pill, X } from 'lucide-react'

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

function ExtractedFieldTags({ fields }: { fields: ExtractedData[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {fields.map((field) => (
        <span
          key={field.id}
          className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-xs text-foreground"
        >
          <span className="font-medium">{field.value}</span>
        </span>
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
}: ChatBubbleProps) {
  return (
    <div
      role="article"
      aria-label={
        timestamp ? `Nachricht vom ${timestamp}` : 'Chat-Nachricht'
      }
      className={cn(
        'flex',
        variant === 'sent' && 'justify-end',
        variant === 'received' && 'justify-start',
        variant === 'system' && 'justify-center',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] px-4 py-2.5',
          variant === 'sent' &&
            !isMedication &&
            'rounded-2xl rounded-br-sm bg-primary text-primary-foreground',
          variant === 'sent' &&
            isMedication &&
            'rounded-2xl rounded-br-sm bg-teal-600 text-white',
          variant === 'received' &&
            'rounded-2xl rounded-bl-sm bg-card text-card-foreground shadow-sm',
          variant === 'system' && 'rounded-xl bg-muted text-foreground',
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
                onClick={onRetryExtraction}
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
                onClick={onRetryExtraction}
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
                <Mic className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden="true" />
              )}
              {isPhoto && !content && (
                <div className="flex items-center gap-1.5">
                  <Camera className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-sm">Foto</span>
                </div>
              )}
              {isPhoto && content && (
                <Camera className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden="true" />
              )}
              {content && <p className="text-sm">{content}</p>}
            </div>
            {photos && photos.length > 0 && (
              <PhotoGrid photos={photos} getSignedUrl={getSignedUrl} />
            )}
            {extractedFields && extractedFields.length > 0 && (
              <ExtractedFieldTags fields={extractedFields} />
            )}
            {activeSinceLabel && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs text-success">
                  {activeSinceLabel}
                </span>
                {onEndSymptom && (
                  <button
                    type="button"
                    onClick={onEndSymptom}
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
              <p
                className={cn(
                  'mt-1 text-xs',
                  variant === 'sent'
                    ? isMedication
                      ? 'text-white/70'
                      : 'text-primary-foreground/70'
                    : 'text-muted-foreground',
                )}
              >
                {timestamp}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
