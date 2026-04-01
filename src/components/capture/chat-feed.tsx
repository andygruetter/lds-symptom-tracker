'use client'

import { useEffect, useRef, useState } from 'react'

import { ChatBubble } from '@/components/capture/chat-bubble'
import { ReviewBubble } from '@/components/capture/review-bubble'
import { generateClarificationQuestions } from '@/lib/ai/clarification'
import type { ExtractedData } from '@/types/ai'
import type { EventPhoto, SymptomEvent } from '@/types/symptom'

interface ChatFeedProps {
  events: SymptomEvent[]
  extractedDataMap?: Record<string, ExtractedData[]>
  photosMap?: Record<string, EventPhoto[]>
  getSignedPhotoUrl?: (storagePath: string) => Promise<string>
  isLoading: boolean
  onRetryExtraction?: (eventId: string) => void
  onRetryTranscription?: (eventId: string) => void
  onConfirmEvent?: (eventId: string) => void
  onCorrectField?: (
    eventId: string,
    fieldName: string,
    newValue: string,
  ) => void
  onAnswerClarification?: (
    eventId: string,
    fieldName: string,
    answer: string,
  ) => void
  onNavigateToEvent?: (eventId: string) => void
  onAddPhotoToEvent?: (eventId: string) => void
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatFeed({
  events,
  extractedDataMap = {},
  photosMap = {},
  getSignedPhotoUrl,
  isLoading,
  onRetryExtraction,
  onRetryTranscription,
  onConfirmEvent,
  onCorrectField,
  onAnswerClarification,
  onNavigateToEvent,
  onAddPhotoToEvent,
}: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(
    null,
  )

  // Auto-scroll bei neuen Events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Wird geladen...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8">
        <p className="text-center text-sm text-muted-foreground">
          Beschreibe dein Symptom per Text — die KI extrahiert automatisch die
          wichtigen Daten.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col-reverse overflow-y-auto px-4 py-4">
      <div ref={bottomRef} />
      <div className="flex flex-col gap-3">
        {[...events].reverse().map((event) => {
          const isMedication = event.event_type === 'medication'
          const extractedFields = extractedDataMap[event.id]
          const eventPhotos = photosMap[event.id]

          const isVoice = event.event_type === 'voice'
          const hasAudio = !!event.audio_url
          const hasPhotos = eventPhotos && eventPhotos.length > 0

          return (
            <div key={event.id} className="flex flex-col gap-1.5">
              {/* Patient Message (Sent) */}
              <ChatBubble
                variant="sent"
                content={event.raw_input ?? undefined}
                timestamp={formatTimestamp(event.created_at)}
                isMedication={isMedication}
                isVoice={isVoice}
                isPhoto={!!hasPhotos}
                photos={eventPhotos}
                getSignedUrl={getSignedPhotoUrl}
                eventId={event.id}
                eventStatus={event.status}
                onNavigate={onNavigateToEvent}
                onAddPhoto={onAddPhotoToEvent}
                showRerunMenu={
                  event.status === 'extracted' || event.status === 'confirmed'
                }
                isVoiceEvent={hasAudio}
                onRetryExtraction={
                  onRetryExtraction
                    ? () => onRetryExtraction(event.id)
                    : undefined
                }
                onRetryTranscription={
                  onRetryTranscription
                    ? () => onRetryTranscription(event.id)
                    : undefined
                }
              />

              {/* Processing indicator for pending/transcribed events
                 Voice+pending: Text "Sprachaufnahme wird verarbeitet..." (Transkription läuft)
                 Voice+transcribed / Text+pending: ProcessingDots (Extraktion läuft) */}
              {(event.status === 'pending' ||
                event.status === 'transcribed') && (
                <ChatBubble
                  variant="system"
                  content={
                    isVoice && event.status === 'pending'
                      ? 'Sprachaufnahme wird verarbeitet...'
                      : undefined
                  }
                  isProcessing={!(isVoice && event.status === 'pending')}
                />
              )}

              {/* Review-Ansicht für extrahierte Events */}
              {event.status === 'extracted' && extractedFields && (
                <ReviewBubble
                  extractedFields={extractedFields}
                  eventId={event.id}
                  clarificationQuestions={generateClarificationQuestions(
                    extractedFields,
                  )}
                  onConfirm={async (id) => {
                    setConfirmingEventId(id)
                    await onConfirmEvent?.(id)
                    setConfirmingEventId(null)
                  }}
                  onCorrect={(id, fieldName, newValue) =>
                    onCorrectField?.(id, fieldName, newValue)
                  }
                  onAnswerClarification={(id, fieldName, answer) =>
                    onAnswerClarification?.(id, fieldName, answer)
                  }
                  isConfirming={confirmingEventId === event.id}
                />
              )}

              {/* Bestätigte Ansicht */}
              {event.status === 'confirmed' && extractedFields && (
                <ChatBubble
                  variant="received"
                  content="Gespeichert ✓"
                  isMedication={isMedication}
                  extractedFields={extractedFields}
                  eventId={event.id}
                  eventStatus={event.status}
                  onNavigate={onNavigateToEvent}
                />
              )}

              {/* Extraction failed */}
              {event.status === 'extraction_failed' && (
                <ChatBubble
                  variant="received"
                  isExtractionFailed
                  onRetryExtraction={
                    onRetryExtraction
                      ? () => onRetryExtraction(event.id)
                      : undefined
                  }
                  eventId={event.id}
                  eventStatus={event.status}
                  onNavigate={onNavigateToEvent}
                />
              )}

              {/* Transcription failed */}
              {event.status === 'transcription_failed' && (
                <ChatBubble
                  variant="received"
                  isTranscriptionFailed
                  onRetryExtraction={
                    onRetryExtraction
                      ? () => onRetryExtraction(event.id)
                      : undefined
                  }
                  eventId={event.id}
                  eventStatus={event.status}
                  onNavigate={onNavigateToEvent}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
