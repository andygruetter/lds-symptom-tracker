'use client'

import { Pill } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ExtractedData } from '@/types/ai'

interface ChatBubbleProps {
  variant: 'sent' | 'received' | 'system'
  content?: string
  timestamp?: string
  isProcessing?: boolean
  isMedication?: boolean
  extractedFields?: ExtractedData[]
  isExtractionFailed?: boolean
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

export function ChatBubble({
  variant,
  content,
  timestamp,
  isProcessing = false,
  isMedication = false,
  extractedFields,
  isExtractionFailed = false,
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
        ) : (
          <>
            <div className="flex items-start gap-1.5">
              {isMedication && (
                <Pill className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              )}
              {content && <p className="text-sm">{content}</p>}
            </div>
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
