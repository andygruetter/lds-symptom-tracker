'use client'

import { useEffect, useRef, useState } from 'react'

import { ClarificationBubble } from '@/components/capture/clarification-bubble'
import { ConfidenceIndicator } from '@/components/capture/confidence-indicator'
import { SymptomTag } from '@/components/capture/symptom-tag'
import type { ClarificationQuestion, ExtractedData } from '@/types/ai'

const ACTIVITY_FIELDS = new Set([
  'aktivitaet_kategorie',
  'aktivitaet_zeitbezug',
  'bemerkungen',
])

const FIELD_OPTIONS: Record<string, string[]> = {
  aktivitaet_kategorie: [
    'Sport / Bewegung',
    'Arbeit',
    'Essen / Trinken',
    'Schlaf / Ruhe',
    'Hausarbeit',
    'Freizeit',
    'Sonstiges',
  ],
  aktivitaet_zeitbezug: ['waehrend', 'nach', 'vor'],
}

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

function serializeRemarks(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length <= 1) {
    // Single line: strip any bullet prefix
    return lines.length === 1 ? lines[0].replace(/^- /, '') : ''
  }
  // Multiple lines: ensure bullet prefix
  return lines.map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n')
}

function renderRemarks(value: string): React.ReactNode {
  if (!value.includes('\n')) {
    return <span>{value}</span>
  }
  const items = value.split('\n').filter(Boolean)
  return (
    <ul className="list-inside list-disc text-xs">
      {items.map((item) => (
        <li key={item}>{item.replace(/^- /, '')}</li>
      ))}
    </ul>
  )
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
  const [editingRemarks, setEditingRemarks] = useState(false)
  const [remarksValue, setRemarksValue] = useState('')
  const remarksRef = useRef<HTMLTextAreaElement>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const medicalFields = extractedFields.filter(
    (f) => !ACTIVITY_FIELDS.has(f.field_name),
  )
  const activityFields = extractedFields.filter((f) =>
    ACTIVITY_FIELDS.has(f.field_name),
  )
  const remarksField = activityFields.find(
    (f) => f.field_name === 'bemerkungen',
  )
  const tagActivityFields = activityFields.filter(
    (f) => f.field_name !== 'bemerkungen',
  )

  const avgConfidence = getAverageConfidence(extractedFields)
  const hasClarifications = clarificationQuestions.length > 0
  const allClarificationsAnswered =
    !hasClarifications ||
    clarificationQuestions.every((q) => q.fieldName in answers)

  useEffect(() => {
    if (editingRemarks && remarksRef.current) {
      remarksRef.current.focus()
    }
  }, [editingRemarks])

  function handleEdit(fieldName: string, newValue: string) {
    onCorrect(eventId, fieldName, newValue)
    setEditingField(null)
  }

  function handleStartEditRemarks() {
    setRemarksValue(remarksField!.value)
    setEditingRemarks(true)
  }

  function handleSaveRemarks() {
    const serialized = serializeRemarks(remarksValue)
    if (serialized !== remarksField?.value) {
      if (serialized) {
        onCorrect(eventId, 'bemerkungen', serialized)
      }
    }
    setEditingRemarks(false)
  }

  function handleRemarksKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditingRemarks(false)
    }
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
          {/* Medical fields */}
          <div className="flex flex-wrap gap-1.5">
            {medicalFields.map((field) => (
              <SymptomTag
                key={field.id}
                label={field.field_name}
                value={field.value}
                confidence={field.confidence}
                editable={!field.confirmed}
                isEditing={editingField === field.id}
                options={FIELD_OPTIONS[field.field_name]}
                onStartEdit={() => setEditingField(field.id)}
                onEdit={(newValue) => handleEdit(field.field_name, newValue)}
                onCancelEdit={() => setEditingField(null)}
              />
            ))}
          </div>

          {/* Activity fields section */}
          {activityFields.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Aktivität
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tagActivityFields.map((field) => (
                  <SymptomTag
                    key={field.id}
                    label={field.field_name}
                    value={field.value}
                    confidence={field.confidence}
                    editable={!field.confirmed}
                    isEditing={editingField === field.id}
                    options={FIELD_OPTIONS[field.field_name]}
                    onStartEdit={() => setEditingField(field.id)}
                    onEdit={(newValue) =>
                      handleEdit(field.field_name, newValue)
                    }
                    onCancelEdit={() => setEditingField(null)}
                  />
                ))}
              </div>

              {/* Remarks */}
              {remarksField && (
                <div className="mt-1.5">
                  {editingRemarks ? (
                    <textarea
                      ref={remarksRef}
                      value={remarksValue}
                      onChange={(e) => setRemarksValue(e.target.value)}
                      onBlur={handleSaveRemarks}
                      onKeyDown={handleRemarksKeyDown}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                      rows={3}
                      aria-label="Bemerkungen bearbeiten"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEditRemarks}
                      className="w-full rounded bg-muted px-2 py-1 text-left text-xs text-foreground"
                      aria-label="bemerkungen ändern"
                    >
                      {renderRemarks(remarksField.value)}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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
          if (
            !isAnswered &&
            firstUnanswered &&
            q.fieldName !== firstUnanswered.fieldName
          )
            return null
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
