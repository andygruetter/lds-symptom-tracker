'use client'

import { ChatFeed } from '@/components/capture/chat-feed'
import { InputBar } from '@/components/capture/input-bar'
import { useSymptomEvents } from '@/hooks/use-symptom-events'
import {
  answerClarification,
  confirmSymptomEvent,
  correctExtractedField,
  createSymptomEvent,
  endSymptomEvent,
} from '@/lib/actions/symptom-actions'

export default function CapturePage() {
  const {
    events,
    extractedDataMap,
    isLoading,
    addOptimisticEvent,
    removeOptimisticEvent,
    refreshExtractedData,
  } = useSymptomEvents()

  const handleSendText = async (text: string) => {
    const optimisticId = addOptimisticEvent(text)
    const result = await createSymptomEvent({ raw_input: text })
    if (result.error) {
      removeOptimisticEvent(optimisticId)
    }
  }

  const handleConfirmEvent = async (eventId: string) => {
    await confirmSymptomEvent({ eventId })
  }

  const handleCorrectField = async (
    eventId: string,
    fieldName: string,
    newValue: string,
  ) => {
    await correctExtractedField({ eventId, fieldName, newValue })
    await refreshExtractedData([eventId])
  }

  const handleEndSymptom = async (eventId: string) => {
    const result = await endSymptomEvent({ eventId })
    if (result.error) {
      console.error('[EndSymptom] Fehler:', result.error.error)
    }
  }

  const handleAnswerClarification = async (
    eventId: string,
    fieldName: string,
    answer: string,
  ) => {
    const result = await answerClarification({ eventId, fieldName, answer })
    if (result.error) {
      console.error('[Clarification] Fehler:', result.error.error)
      throw new Error(result.error.error)
    }
  }

  const handleRetryExtraction = async (eventId: string) => {
    try {
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptomEventId: eventId }),
      })
      if (!response.ok) {
        console.error('[Retry] Extraction failed:', response.status)
      }
    } catch (err) {
      console.error('[Retry] Network error:', err)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-5rem)] flex-col pb-[4.5rem]">
      <ChatFeed
        events={events}
        extractedDataMap={extractedDataMap}
        isLoading={isLoading}
        onRetryExtraction={handleRetryExtraction}
        onConfirmEvent={handleConfirmEvent}
        onCorrectField={handleCorrectField}
        onEndSymptom={handleEndSymptom}
        onAnswerClarification={handleAnswerClarification}
      />
      <InputBar onSendText={handleSendText} />
    </div>
  )
}
