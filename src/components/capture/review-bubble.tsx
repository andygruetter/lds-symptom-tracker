'use client'

import { useState } from 'react'

import { ClarificationInline } from '@/components/capture/clarification-inline'
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

  // Find the first unanswered clarification question
  const firstUnanswered = clarificationQuestions.find(
    (q) => !(q.fieldName in answers),
  )

  // Filter out <UNKNOWN> fields — they provide no value to the user
  const visibleFields = extractedFields.filter(
    (f) => f.value !== '<UNKNOWN>' && f.value !== 'UNKNOWN',
  )
  const hasVisibleFields = visibleFields.length > 0

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-card-foreground shadow-sm">
        {/* Extracted fields as tags (UNKNOWN values hidden) */}
        {hasVisibleFields ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleFields.map((field) => (
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Konnte nicht erkannt werden — bitte ergänze die Angaben unten.
          </p>
        )}

        <div className="mt-2">
          <ConfidenceIndicator score={avgConfidence} />
        </div>

        {/* Clarification questions — inline, sequential */}
        {hasClarifications && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {clarificationQuestions.map((q) => {
              const isAnswered = q.fieldName in answers
              // Show answered questions + the first unanswered one
              if (
                !isAnswered &&
                firstUnanswered &&
                q.fieldName !== firstUnanswered.fieldName
              )
                return null
              return (
                <ClarificationInline
                  key={q.fieldName}
                  question={q}
                  onAnswer={handleClarificationAnswer}
                  isAnswered={isAnswered}
                  answeredValue={answers[q.fieldName]}
                />
              )
            })}
          </div>
        )}

        {/* Action buttons — shown when all clarifications are answered */}
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
  )
}
