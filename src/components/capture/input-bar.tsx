'use client'

import { useRef, useState } from 'react'

import { Camera, Mic, SendHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'

interface InputBarProps {
  onSendText: (text: string) => void | Promise<void>
  disabled?: boolean
}

export function InputBar({ onSendText, disabled = false }: InputBarProps) {
  const [text, setText] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasText = text.trim().length > 0

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

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-screen-sm items-end gap-2">
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
            disabled
            aria-label="Sprachaufnahme starten"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-40"
          >
            <Mic className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
