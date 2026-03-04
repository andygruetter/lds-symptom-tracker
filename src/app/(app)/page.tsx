'use client'

import { useCallback, useRef } from 'react'

import { ChatFeed } from '@/components/capture/chat-feed'
import { InputBar } from '@/components/capture/input-bar'
import { PushOptIn } from '@/components/capture/push-opt-in'
import { useSymptomEvents } from '@/hooks/use-symptom-events'
import {
  addPhotosToEvent,
  answerClarification,
  confirmSymptomEvent,
  correctExtractedField,
  createSymptomEvent,
  createVoiceSymptomEvent,
  endSymptomEvent,
} from '@/lib/actions/symptom-actions'
import { createBrowserClient } from '@/lib/db/client'
import { getSignedPhotoUrl } from '@/lib/db/media'
import { convertToWav } from '@/lib/utils/audio-convert'

export default function CapturePage() {
  const supabaseRef = useRef(createBrowserClient())

  const handleGetSignedPhotoUrl = useCallback(async (storagePath: string) => {
    return getSignedPhotoUrl(supabaseRef.current, storagePath)
  }, [])

  const {
    events,
    extractedDataMap,
    photosMap,
    isLoading,
    addOptimisticEvent,
    removeOptimisticEvent,
    refreshExtractedData,
    refreshPhotos,
  } = useSymptomEvents()

  const handleSendText = async (text: string) => {
    const optimisticId = addOptimisticEvent(text)
    const result = await createSymptomEvent({ raw_input: text })
    if (result.error) {
      removeOptimisticEvent(optimisticId)
    }
  }

  const handleSendAudio = async (blob: Blob, mimeType: string) => {
    // Convert to WAV for reliable Whisper transcription
    let audioBlob: Blob
    let audioMime: string
    try {
      audioBlob = await convertToWav(blob)
      audioMime = 'audio/wav'
    } catch {
      audioBlob = blob
      audioMime = mimeType
    }

    const optimisticId = addOptimisticEvent(null, 'voice')
    const formData = new FormData()
    const ext =
      audioMime === 'audio/wav'
        ? 'wav'
        : mimeType.includes('mp4')
          ? 'm4a'
          : 'webm'
    formData.append('audio', audioBlob, `recording.${ext}`)
    formData.append('mimeType', audioMime)
    try {
      const result = await createVoiceSymptomEvent(formData)
      if (result.error) {
        removeOptimisticEvent(optimisticId)
      }
    } catch {
      removeOptimisticEvent(optimisticId)
    }
  }

  const handleSendPhotos = async (text: string | null, photos: File[]) => {
    // Create event first (text or default "Foto-Dokumentation")
    const rawInput = text || 'Foto-Dokumentation'
    const optimisticId = addOptimisticEvent(rawInput)
    const eventResult = await createSymptomEvent({ raw_input: rawInput })

    if (eventResult.error || !eventResult.data) {
      removeOptimisticEvent(optimisticId)
      return
    }

    // Upload photos to event
    const formData = new FormData()
    formData.append('eventId', eventResult.data.id)
    for (const photo of photos) {
      formData.append('photos', photo)
    }
    const photoResult = await addPhotosToEvent(formData)
    if (photoResult.error) {
      console.error('[Photo] Upload failed:', photoResult.error.error)
    } else {
      // Fotos nach Upload laden (kein Realtime-Subscription für event_photos)
      await refreshPhotos([eventResult.data.id])
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
      {events.length > 0 && <PushOptIn />}
      <ChatFeed
        events={events}
        extractedDataMap={extractedDataMap}
        photosMap={photosMap}
        getSignedPhotoUrl={handleGetSignedPhotoUrl}
        isLoading={isLoading}
        onRetryExtraction={handleRetryExtraction}
        onConfirmEvent={handleConfirmEvent}
        onCorrectField={handleCorrectField}
        onEndSymptom={handleEndSymptom}
        onAnswerClarification={handleAnswerClarification}
      />
      <InputBar
        onSendText={handleSendText}
        onSendAudio={handleSendAudio}
        onSendPhotos={handleSendPhotos}
      />
    </div>
  )
}
