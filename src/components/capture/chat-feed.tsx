'use client'

import { useEffect, useRef, useState } from 'react'

import { ChatBubble } from '@/components/capture/chat-bubble'
import { ReviewBubble } from '@/components/capture/review-bubble'
import { generateClarificationQuestions } from '@/lib/ai/clarification'
import { formatActiveSince, formatDuration } from '@/lib/utils/duration'
import type { ExtractedData } from '@/types/ai'
import type { SymptomEvent } from '@/types/symptom'

interface ChatFeedProps {
  events: SymptomEvent[]
  extractedDataMap?: Record<string, ExtractedData[]>
  isLoading: boolean
  onRetryExtraction?: (eventId: string) => void
  onConfirmEvent?: (eventId: string) => void
  onCorrectField?: (
    eventId: string,
    fieldName: string,
    newValue: string,
  ) => void
  onEndSymptom?: (eventId: string) => void
  onAnswerClarification?: (
    eventId: string,
    fieldName: string,
    answer: string,
  ) => void
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
  isLoading,
  onRetryExtraction,
  onConfirmEvent,
  onCorrectField,
  onEndSymptom,
  onAnswerClarification,
}: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [confirmingEventId, setConfirmingEventId] = useState<string | null>(
    null,
  )
  const [, setTick] = useState(0)

  // Auto-scroll bei neuen Events
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  // Update "Aktiv seit" badges every minute
  const hasActiveEvents = events.some(
    (e) => e.status === 'confirmed' && !e.ended_at && e.event_type !== 'medication',
  )
  useEffect(() => {
    if (!hasActiveEvents) return
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [hasActiveEvents])

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

          const isVoice = event.event_type === 'voice'

          return (
            <div key={event.id} className="flex flex-col gap-1.5">
              {/* Patient Message (Sent) */}
              <ChatBubble
                variant="sent"
                content={event.raw_input ?? undefined}
                timestamp={formatTimestamp(event.created_at)}
                isMedication={isMedication}
                isVoice={isVoice}
              />

              {/* Processing indicator for pending events */}
              {event.status === 'pending' && (
                <ChatBubble
                  variant="system"
                  content={
                    isVoice
                      ? 'Sprachaufnahme wird verarbeitet...'
                      : undefined
                  }
                  isProcessing={!isVoice}
                />
              )}

              {/* Review-Ansicht für extrahierte Events */}
              {event.status === 'extracted' && extractedFields && (
                <ReviewBubble
                  extractedFields={extractedFields}
                  eventId={event.id}
                  clarificationQuestions={generateClarificationQuestions(extractedFields)}
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
                  activeSinceLabel={
                    !isMedication && !event.ended_at
                      ? formatActiveSince(new Date(event.created_at))
                      : undefined
                  }
                  durationLabel={
                    !isMedication && event.ended_at
                      ? formatDuration(
                          new Date(event.created_at),
                          new Date(event.ended_at),
                        )
                      : undefined
                  }
                  onEndSymptom={
                    !isMedication && !event.ended_at && onEndSymptom
                      ? () => onEndSymptom(event.id)
                      : undefined
                  }
                />
              )}

              {/* System-Bubble: Symptom beendet */}
              {event.status === 'confirmed' && event.ended_at && !isMedication && (
                <ChatBubble
                  variant="system"
                  content={`✓ Symptom beendet — Dauer: ${formatDuration(new Date(event.created_at), new Date(event.ended_at))}`}
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
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
