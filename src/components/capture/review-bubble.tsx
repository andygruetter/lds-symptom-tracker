'use client'

import { useState } from 'react'

import { ClarificationBubble } from '@/components/capture/clarification-bubble'
import { ConfidenceIndicator } from '@/components/capture/confidence-indicator'
import { SymptomTag } from '@/components/capture/symptom-tag'
import type { ClarificationQuestion, ExtractedData } from '@/types/ai'

interface ReviewBubbleProps {
  extractedFields: ExtractedData[]
  eventId: string
  clarificationQuestions?: ClarificationQuestion[]
  onConfirm: (eventId: string) => void
  onCorrect: (eventId: string, fieldName: string, newValue: string) => void
  onAnswerClarification?: (
    eventId: string,
    fieldName: string,
    answer: string,
  ) => void
  isConfirming?: boolean
}

function getAverageConfidence(fields: ExtractedData[]): number {
  if (fields.length === 0) return 0
  const sum = fields.reduce((acc, f) => acc + f.confidence, 0)
  return Math.round(sum / fields.length)
}

export function ReviewBubble({
  extractedFields,
  eventId,
  clarificationQuestions = [],
  onConfirm,
  onCorrect,
  onAnswerClarification,
  isConfirming = false,
}: ReviewBubbleProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const avgConfidence = getAverageConfidence(extractedFields)
  const hasClarifications = clarificationQuestions.length > 0
  const allClarificationsAnswered =
    !hasClarifications ||
    clarificationQuestions.every((q) => q.fieldName in answers)

  function handleEdit(fieldName: string, newValue: string) {
    onCorrect(eventId, fieldName, newValue)
    setEditingField(null)
  }

  async function handleClarificationAnswer(fieldName: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [fieldName]: answer }))
    try {
      await onAnswerClarification?.(eventId, fieldName, answer)
    } catch {
      // Rollback on error
      setAnswers((prev) => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }

  return (
    <>
      {/* Tags + ConfidenceIndicator Bubble */}
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-card-foreground shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            {extractedFields.map((field) => (
              <SymptomTag
                key={field.id}
                label={field.field_name}
                value={field.value}
                confidence={field.confidence}
                editable={!field.confirmed}
                isEditing={editingField === field.id}
                onStartEdit={() => setEditingField(field.id)}
                onEdit={(newValue) => handleEdit(field.field_name, newValue)}
                onCancelEdit={() => setEditingField(null)}
              />
            ))}
          </div>

          <div className="mt-2">
            <ConfidenceIndicator score={avgConfidence} />
          </div>

          {/* Buttons only shown when all clarifications are answered */}
          {allClarificationsAnswered && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onConfirm(eventId)}
                disabled={isConfirming}
                className="min-h-[48px] min-w-[48px] rounded-full bg-[#3A856F] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isConfirming ? 'Wird bestätigt...' : 'Bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const firstUnconfirmed = extractedFields.find(
                    (f) => !f.confirmed,
                  )
                  if (firstUnconfirmed) {
                    setEditingField(firstUnconfirmed.id)
                  }
                }}
                className="min-h-[48px] min-w-[48px] rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground"
              >
                Ändern
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clarification questions — sequential, answer-based */}
      {(() => {
        const firstUnanswered = clarificationQuestions.find(
          (q) => !(q.fieldName in answers),
        )
        return clarificationQuestions.map((q) => {
          const isAnswered = q.fieldName in answers
          // Show answered questions + the first unanswered one
          if (!isAnswered && firstUnanswered && q.fieldName !== firstUnanswered.fieldName) return null
          return (
            <ClarificationBubble
              key={q.fieldName}
              question={q}
              onAnswer={handleClarificationAnswer}
              isAnswered={isAnswered}
              answeredValue={answers[q.fieldName]}
            />
          )
        })
      })()}
    </>
  )
}
