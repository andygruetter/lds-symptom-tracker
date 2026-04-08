'use client'

import { useState } from 'react'

import { Clock, MapPin } from 'lucide-react'

import { ClarificationInline } from '@/components/capture/clarification-inline'
import { DurationSlider } from '@/components/capture/duration-slider'
import { FIELD_LABELS, SymptomTag } from '@/components/capture/symptom-tag'
import { cn } from '@/lib/utils'
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

function getConfidenceLabel(score: number): {
  label: string
  colorClass: string
  dotClass: string
} {
  if (score >= 85)
    return {
      label: 'sicher erkannt',
      colorClass: 'text-[#3A856F]',
      dotClass: 'bg-[#3A856F]',
    }
  if (score >= 70)
    return {
      label: 'relativ sicher',
      colorClass: 'text-[#B8913A]',
      dotClass: 'bg-[#B8913A]',
    }
  return {
    label: 'unsicher, bitte prüfen',
    colorClass: 'text-[#C06A3C]',
    dotClass: 'bg-[#C06A3C]',
  }
}

function formatSymptomTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  const weekday = date.toLocaleDateString('de-CH', { weekday: 'short' })
  const day = date.getDate()
  const month = date.toLocaleDateString('de-CH', { month: 'short' })
  const time = date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${weekday} ${day}. ${month}, ${time}`
}

function formatDurationMinutes(minutesStr: string): string | null {
  const minutes = parseInt(minutesStr, 10)
  if (isNaN(minutes) || minutes < 0) return null
  if (minutes === 0) return '< 30 Sek.'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`
  if (hours > 0) return `${hours} Std.`
  return `${minutes} Min.`
}

function getSeverityInfo(value: string): {
  label: string
  colorClass: string
} {
  const num = parseInt(value, 10)
  if (!isNaN(num)) {
    if (num >= 7) return { label: `stark (${num})`, colorClass: 'bg-red-500' }
    if (num >= 4)
      return { label: `mittel (${num})`, colorClass: 'bg-yellow-500' }
    return { label: `leicht (${num})`, colorClass: 'bg-green-500' }
  }
  const lower = value.toLowerCase()
  if (['stark', 'sehr stark', 'unerträglich'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-red-500' }
  if (['mittel', 'mässig', 'moderat'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-yellow-500' }
  if (['leicht', 'schwach', 'gering'].some((s) => lower.includes(s)))
    return { label: value, colorClass: 'bg-green-500' }
  return { label: value, colorClass: 'bg-yellow-500' }
}

/** Fields rendered in the structured layout (not as generic tags) */
const STRUCTURED_FIELDS = new Set([
  'symptom_name',
  'precursor',
  'body_region',
  'side',
  'symptom_type',
  'intensity',
  'symptom_time',
  'duration',
])

function getFieldValue(
  fields: ExtractedData[],
  name: string,
): string | undefined {
  const f = fields.find((f) => f.field_name === name)
  if (!f || f.value === '<UNKNOWN>' || f.value === 'UNKNOWN') return undefined
  return f.value
}

function getField(
  fields: ExtractedData[],
  name: string,
): ExtractedData | undefined {
  return fields.find((f) => f.field_name === name)
}

function groupBySymptomIndex(fields: ExtractedData[]): ExtractedData[][] {
  const groups = new Map<number, ExtractedData[]>()
  for (const field of fields) {
    if (field.medication_index !== null) continue
    const idx = field.symptom_index ?? 0
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, fields]) => fields)
}

function MedicationGroup({ fields }: { fields: ExtractedData[] }) {
  const byIndex = new Map<number, ExtractedData[]>()
  for (const f of fields) {
    if (f.medication_index === null) continue
    const idx = f.medication_index
    if (!byIndex.has(idx)) byIndex.set(idx, [])
    byIndex.get(idx)!.push(f)
  }
  const sorted = [...byIndex.entries()].sort(([a], [b]) => a - b)
  if (sorted.length === 0) return null

  return (
    <div className="mt-2 border-t border-border/50 pt-2">
      <p className="mb-1 text-xs font-semibold text-muted-foreground">
        Medikamente
      </p>
      <div className="flex flex-col gap-1">
        {sorted.map(([idx, medFields]) => {
          const nameField = medFields.find(
            (f) => f.field_name === 'medication_taken',
          )
          const dosageField = medFields.find(
            (f) => f.field_name === 'medication_dosage',
          )
          const name = nameField?.value ?? '—'
          const dosage = dosageField?.value
          return (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-sm text-foreground"
            >
              <span>💊</span>
              <span>
                {name}
                {dosage ? ` · ${dosage}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SingleSymptomReview({
  fields,
  editingField,
  setEditingField,
  handleEdit,
  sliderDuration,
  onSliderCommit,
}: {
  fields: ExtractedData[]
  editingField: string | null
  setEditingField: (id: string | null) => void
  handleEdit: (fieldName: string, newValue: string) => void
  sliderDuration: number | null
  onSliderCommit: (minutes: number) => void
}) {
  const visibleFields = fields.filter(
    (f) => f.value !== '<UNKNOWN>' && f.value !== 'UNKNOWN',
  )

  const symptomName = getFieldValue(fields, 'symptom_name')
  const precursor = getFieldValue(fields, 'precursor')
  const bodyRegion = getFieldValue(fields, 'body_region')
  const side = getFieldValue(fields, 'side')
  const symptomType = getFieldValue(fields, 'symptom_type')
  const intensity = getFieldValue(fields, 'intensity')
  const symptomTime = getFieldValue(fields, 'symptom_time')
  const duration = getFieldValue(fields, 'duration')
  const durationField = fields.find(
    (f) =>
      f.field_name === 'duration' &&
      f.value !== '<UNKNOWN>' &&
      f.value !== 'UNKNOWN',
  )

  const locationParts = [bodyRegion, side].filter(Boolean)
  if (symptomType) locationParts.push(symptomType)
  const severityInfo = intensity ? getSeverityInfo(intensity) : null
  const formattedTime = symptomTime ? formatSymptomTimestamp(symptomTime) : null
  const formattedDuration = duration ? formatDurationMinutes(duration) : null

  const extraFields = visibleFields.filter(
    (f) => !STRUCTURED_FIELDS.has(f.field_name) && f.medication_index === null,
  )

  function renderEditableField(
    fieldName: string,
    displayContent: React.ReactNode,
  ) {
    const field = getField(fields, fieldName)
    if (!field) return null

    if (editingField === field.id) {
      return (
        <SymptomTag
          label={field.field_name}
          value={field.value}
          confidence={field.confidence}
          editable={!field.confirmed}
          isEditing
          onStartEdit={() => setEditingField(field.id)}
          onEdit={(newValue) => handleEdit(field.field_name, newValue)}
          onCancelEdit={() => setEditingField(null)}
        />
      )
    }

    if (field.confirmed) {
      return displayContent
    }

    return (
      <button
        type="button"
        onClick={() => setEditingField(field.id)}
        className="min-h-[44px] w-full text-left active:opacity-60"
        aria-label={`${FIELD_LABELS[fieldName] ?? fieldName} ändern`}
      >
        {displayContent}
      </button>
    )
  }

  if (visibleFields.length === 0) return null

  return (
    <div className="space-y-1.5">
      {symptomName &&
        renderEditableField(
          'symptom_name',
          <p className="text-sm font-semibold text-foreground">
            {symptomName}
          </p>,
        )}

      {precursor &&
        renderEditableField(
          'precursor',
          <p className="text-xs text-muted-foreground">
            Vorzeichen: {precursor}
          </p>,
        )}

      {(locationParts.length > 0 || severityInfo) && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          {locationParts.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="break-words">{locationParts.join(' · ')}</span>
            </span>
          )}
          {locationParts.length > 0 && severityInfo && (
            <span aria-hidden="true">·</span>
          )}
          {severityInfo && (
            <span className="inline-flex items-center gap-1">
              <span
                className={cn(
                  'inline-block size-2 shrink-0 rounded-full',
                  severityInfo.colorClass,
                )}
                aria-hidden="true"
              />
              {severityInfo.label}
            </span>
          )}
        </div>
      )}

      {formattedTime && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3 shrink-0" aria-hidden="true" />
          {formattedTime}
        </p>
      )}

      {/* Duration: Slider im Edit-Modus oder wenn kein Wert vorhanden */}
      {durationField && editingField === durationField.id ? (
        <DurationSlider
          value={duration !== undefined ? parseInt(duration, 10) : undefined}
          onChange={(minutes) => {
            handleEdit('duration', String(minutes))
          }}
        />
      ) : durationField && !durationField.confirmed ? (
        <button
          type="button"
          onClick={() => setEditingField(durationField.id)}
          className="min-h-[44px] w-full text-left active:opacity-60"
          aria-label="Dauer ändern"
        >
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {formattedDuration}
          </p>
        </button>
      ) : durationField ? (
        formattedDuration && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            {formattedDuration}
          </p>
        )
      ) : (
        /* Kein Duration-Feld: Slider ohne Vorauswahl */
        <DurationSlider
          value={sliderDuration !== null ? sliderDuration : undefined}
          onChange={onSliderCommit}
        />
      )}

      {extraFields.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {extraFields.map((field) => (
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
      )}
    </div>
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
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [sliderDuration, setSliderDuration] = useState<number | null>(null)

  const avgConfidence = getAverageConfidence(extractedFields)
  const hasClarifications = clarificationQuestions.length > 0
  const allClarificationsAnswered =
    !hasClarifications ||
    clarificationQuestions.every((q) => q.fieldName in answers)

  function handleEdit(fieldName: string, newValue: string) {
    onCorrect(eventId, fieldName, newValue)
    setEditingField(null)
  }

  function handleSliderCommit(minutes: number) {
    setSliderDuration(minutes)
    onCorrect(eventId, 'duration', String(minutes))
  }

  async function handleClarificationAnswer(fieldName: string, answer: string) {
    setAnswers((prev) => ({ ...prev, [fieldName]: answer }))
    try {
      await onAnswerClarification?.(eventId, fieldName, answer)
    } catch {
      setAnswers((prev) => {
        const next = { ...prev }
        delete next[fieldName]
        return next
      })
    }
  }

  const firstUnanswered = clarificationQuestions.find(
    (q) => !(q.fieldName in answers),
  )

  const visibleFields = extractedFields.filter(
    (f) => f.value !== '<UNKNOWN>' && f.value !== 'UNKNOWN',
  )
  const hasVisibleFields = visibleFields.length > 0

  const hasDuration =
    extractedFields.some(
      (f) =>
        f.field_name === 'duration' &&
        f.value !== '<UNKNOWN>' &&
        f.value !== 'UNKNOWN',
    ) || sliderDuration !== null

  const symptomGroups = groupBySymptomIndex(visibleFields)
  const confidenceInfo = getConfidenceLabel(avgConfidence)

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-card-foreground shadow-sm">
        {hasVisibleFields ? (
          <div className="space-y-2">
            {symptomGroups.map((group, i) => (
              <div key={i}>
                {i > 0 && <div className="mb-2 border-t border-border/50" />}
                <SingleSymptomReview
                  fields={group}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  handleEdit={handleEdit}
                  sliderDuration={sliderDuration}
                  onSliderCommit={handleSliderCommit}
                />
              </div>
            ))}
            <MedicationGroup fields={visibleFields} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Konnte nicht erkannt werden — bitte ergänze die Angaben unten.
          </p>
        )}

        {/* Confidence — text only, no percentage */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-block size-2 rounded-full',
              confidenceInfo.dotClass,
            )}
            aria-hidden="true"
          />
          <span className={confidenceInfo.colorClass}>
            {confidenceInfo.label}
          </span>
        </div>

        {/* Clarification questions */}
        {hasClarifications && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {clarificationQuestions.map((q) => {
              const isAnswered = q.fieldName in answers
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

        {/* Action buttons */}
        {allClarificationsAnswered && (
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onConfirm(eventId)}
                disabled={isConfirming || !hasDuration}
                aria-describedby={
                  !hasDuration ? `duration-hint-${eventId}` : undefined
                }
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
            {!hasDuration && !isConfirming && (
              <p
                id={`duration-hint-${eventId}`}
                className="text-xs text-muted-foreground"
              >
                Bitte zuerst Dauer angeben
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
