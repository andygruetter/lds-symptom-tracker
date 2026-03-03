'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { ClarificationQuestion } from '@/types/ai'

interface ClarificationBubbleProps {
  question: ClarificationQuestion
  onAnswer: (fieldName: string, answer: string) => void
  isAnswered?: boolean
  answeredValue?: string
}

export function ClarificationBubble({
  question,
  onAnswer,
  isAnswered = false,
  answeredValue,
}: ClarificationBubbleProps) {
  const [showFreeText, setShowFreeText] = useState(false)
  const [freeTextValue, setFreeTextValue] = useState('')

  function handleSelectOption(option: string) {
    onAnswer(question.fieldName, option)
  }

  function handleFreeTextSubmit() {
    if (freeTextValue.trim()) {
      onAnswer(question.fieldName, freeTextValue.trim())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFreeTextSubmit()
    }
    if (e.key === 'Escape') {
      setShowFreeText(false)
      setFreeTextValue('')
    }
  }

  return (
    <div className="flex justify-start">
      <div
        className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-card-foreground shadow-sm"
        role="group"
        aria-label={`Nachfrage: ${question.question}`}
      >
        <p className={cn('text-sm', isAnswered && 'text-muted-foreground')}>
          {question.question}
        </p>

        {!isAnswered ? (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectOption(option)}
                  className="min-h-11 rounded-full border border-border bg-muted px-4 py-2 text-sm text-foreground"
                >
                  {option}
                </button>
              ))}
              {question.allowFreeText && !showFreeText && (
                <button
                  type="button"
                  onClick={() => setShowFreeText(true)}
                  className="min-h-11 rounded-full border border-dashed border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
                >
                  Andere Antwort...
                </button>
              )}
            </div>

            {showFreeText && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={freeTextValue}
                  onChange={(e) => setFreeTextValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Eigene Antwort..."
                  className="min-h-11 flex-1 rounded-full border border-border bg-background px-4 text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleFreeTextSubmit}
                  disabled={!freeTextValue.trim()}
                  className="min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {answeredValue}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
