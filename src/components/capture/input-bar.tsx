'use client'

import { useRef, useState } from 'react'

import { Camera, Mic, MicOff, SendHorizontal, X } from 'lucide-react'

import { AudioWaveform } from '@/components/capture/audio-waveform'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { cn } from '@/lib/utils'

interface InputBarProps {
  onSendText: (text: string) => void | Promise<void>
  onSendAudio?: (blob: Blob, mimeType: string) => void | Promise<void>
  disabled?: boolean
}

export function InputBar({
  onSendText,
  onSendAudio,
  disabled = false,
}: InputBarProps) {
  const [text, setText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    state: recordingState,
    permission,
    duration,
    isWarning,
    analyserData,
    mimeType,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder()

  const hasText = text.trim().length > 0
  const isRecording = recordingState === 'recording'
  const isProcessing = recordingState === 'processing'
  const isPermissionDenied = permission === 'denied'
  const isUnsupported = permission === 'unsupported'
  const isMicDisabled = isPermissionDenied || isUnsupported

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSendingMessage) return

    setIsSendingMessage(true)
    setText('')

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await onSendText(trimmed)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)

    // Auto-grow (max 3 lines)
    const textarea = e.target
    textarea.style.height = 'auto'
    const maxHeight = 72 // ~3 lines at 16px font + padding
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }

  const handlePointerDown = async () => {
    if (isMicDisabled || disabled) return
    await startRecording()
  }

  const handlePointerUp = async () => {
    if (recordingState !== 'recording') return

    const blob = await stopRecording()
    if (blob && mimeType && onSendAudio) {
      await onSendAudio(blob, mimeType)
    }
  }

  const handleCancel = () => {
    cancelRecording()
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-screen-sm items-end gap-2">
        {isRecording || isProcessing ? (
          <>
            {/* Cancel-Button */}
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Aufnahme abbrechen"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-destructive"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            {/* Waveform */}
            <div className="flex-1" aria-live="polite">
              <AudioWaveform
                analyserData={analyserData}
                duration={duration}
                isWarning={isWarning}
              />
            </div>

            {/* Recording indicator (pulsing dot) */}
            <div className="flex min-h-11 min-w-11 items-center justify-center">
              <span className="size-3 animate-pulse rounded-full bg-destructive" />
            </div>
          </>
        ) : (
          <>
            {/* Kamera-Button (Platzhalter) */}
            <button
              type="button"
              disabled
              aria-label="Foto aufnehmen"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground opacity-40"
            >
              <Camera className="size-5" aria-hidden="true" />
            </button>

            {/* Text-Input */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Symptom..."
              disabled={disabled || isSendingMessage}
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary',
                'disabled:opacity-50',
              )}
            />

            {/* Send / Mikrofon Button */}
            {hasText ? (
              <button
                type="button"
                onClick={handleSend}
                disabled={isSendingMessage || disabled}
                aria-label="Nachricht senden"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <SendHorizontal className="size-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                disabled={isMicDisabled || disabled}
                aria-label={
                  isMicDisabled
                    ? 'Mikrofon-Zugriff benötigt'
                    : 'Sprachaufnahme starten'
                }
                title={isMicDisabled ? 'Mikrofon-Zugriff benötigt' : undefined}
                className={cn(
                  'flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50',
                  isMicDisabled && 'opacity-40',
                )}
              >
                {isMicDisabled ? (
                  <MicOff className="size-5" aria-hidden="true" />
                ) : (
                  <Mic className="size-5" aria-hidden="true" />
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
