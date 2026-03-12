'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { ArrowLeft } from 'lucide-react'

import { CorrectionHistory } from '@/components/event/correction-history'
import { correctExtractedField } from '@/lib/actions/symptom-actions'
import { cn } from '@/lib/utils'
import type { ExtractedData } from '@/types/ai'
import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

type Correction = Database['public']['Tables']['corrections']['Row']

type DurationUnit = 'min' | 'std' | 'tage'

const FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptomname',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Symptomtyp',
  intensity: 'Intensität (1–10)',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
}

const SIDE_OPTIONS = ['links', 'rechts', 'beidseits']

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-500',
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return CONFIDENCE_COLORS.high
  if (confidence >= 70) return CONFIDENCE_COLORS.medium
  return CONFIDENCE_COLORS.low
}

function parseDuration(minutes: string): { value: string; unit: DurationUnit } {
  const mins = parseInt(minutes, 10)
  if (isNaN(mins)) return { value: '', unit: 'min' }
  if (mins >= 1440 && mins % 1440 === 0) {
    return { value: String(mins / 1440), unit: 'tage' }
  }
  if (mins >= 60 && mins % 60 === 0) {
    return { value: String(mins / 60), unit: 'std' }
  }
  return { value: String(mins), unit: 'min' }
}

function durationToMinutes(value: string, unit: DurationUnit): string {
  const num = parseFloat(value)
  if (isNaN(num) || num <= 0) return ''
  if (unit === 'tage') return String(Math.round(num * 1440))
  if (unit === 'std') return String(Math.round(num * 60))
  return String(Math.round(num))
}

interface EventEditFormProps {
  event: SymptomEvent
  extractedFields: ExtractedData[]
  corrections: Correction[]
  allFieldNames: string[]
}

interface FieldState {
  value: string
  saving: boolean
  error: string | null
}

export function EventEditForm({
  event,
  extractedFields,
  corrections,
  allFieldNames,
}: EventEditFormProps) {
  const router = useRouter()

  // Build initial values map from extracted fields
  const fieldMap = Object.fromEntries(
    extractedFields.map((f) => [f.field_name, f]),
  )

  const initialValues = useRef<Record<string, string>>(
    Object.fromEntries(
      allFieldNames.map((name) => [name, fieldMap[name]?.value ?? '']),
    ),
  )

  const [fields, setFields] = useState<Record<string, FieldState>>(
    Object.fromEntries(
      allFieldNames.map((name) => [
        name,
        {
          value: fieldMap[name]?.value ?? '',
          saving: false,
          error: null,
        },
      ]),
    ),
  )

  // Duration unit state
  const durationInitial = parseDuration(fieldMap['duration']?.value ?? '')
  const [durationUnit, setDurationUnit] = useState<DurationUnit>(
    durationInitial.unit,
  )
  const [durationDisplay, setDurationDisplay] = useState(durationInitial.value)

  const handleBack = () => {
    // F7-Fix: Fallback auf / bei fehlendem Browser-History (Deep-Links)
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  const saveField = async (fieldName: string, newValue: string) => {
    // F8-Fix: Dirty-Check — nur bei tatsächlicher Änderung speichern
    if (newValue === initialValues.current[fieldName]) return
    if (!newValue.trim()) {
      // Felder können nicht geleert werden — Display auf ursprünglichen Wert zurücksetzen
      setFields((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value: initialValues.current[fieldName],
        },
      }))
      return
    }

    setFields((prev) => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], saving: true, error: null },
    }))

    const result = await correctExtractedField({
      eventId: event.id,
      fieldName,
      newValue,
    })

    if (result.error) {
      setFields((prev) => ({
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          saving: false,
          error: result.error!.error,
        },
      }))
    } else {
      // Update initial value so next blur doesn't re-save
      initialValues.current[fieldName] = newValue
      setFields((prev) => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], saving: false, error: null },
      }))
    }
  }

  const handleBlur = (fieldName: string) => {
    const value = fields[fieldName].value
    saveField(fieldName, value)
  }

  const handleDurationBlur = () => {
    const minutes = durationToMinutes(durationDisplay, durationUnit)
    if (minutes) {
      setFields((prev) => ({
        ...prev,
        duration: { ...prev.duration, value: minutes },
      }))
      saveField('duration', minutes)
    }
  }

  const handleDurationUnitChange = (unit: DurationUnit) => {
    // Convert current display value to new unit
    const currentMinutes = durationToMinutes(durationDisplay, durationUnit)
    setDurationUnit(unit)
    if (currentMinutes) {
      const mins = parseInt(currentMinutes, 10)
      if (unit === 'tage') setDurationDisplay(String(mins / 1440))
      else if (unit === 'std') setDurationDisplay(String(mins / 60))
      else setDurationDisplay(currentMinutes)
    }
  }

  // Format symptom_time for datetime-local input
  const formatForDatetimeLocal = (isoString: string): string => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      if (isNaN(date.getTime())) return ''
      // Lokale Zeit verwenden (nicht UTC) — datetime-local format: YYYY-MM-DDTHH:mm
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    } catch {
      return ''
    }
  }

  const handleSymptomTimeChange = (datetimeLocalValue: string) => {
    // Convert datetime-local to ISO-8601 with timezone offset
    if (!datetimeLocalValue) {
      setFields((prev) => ({
        ...prev,
        symptom_time: { ...prev.symptom_time, value: '' },
      }))
      return
    }
    // Keep as ISO-8601
    const isoValue = new Date(datetimeLocalValue).toISOString()
    setFields((prev) => ({
      ...prev,
      symptom_time: { ...prev.symptom_time, value: isoValue },
    }))
  }

  const handleSymptomTimeBlur = () => {
    saveField('symptom_time', fields.symptom_time.value)
  }

  const renderField = (fieldName: string) => {
    const fieldState = fields[fieldName]
    const extractedField = fieldMap[fieldName]
    const hasValue = !!fieldState.value
    const confidence = extractedField?.confidence ?? null

    return (
      <div key={fieldName} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {FIELD_LABELS[fieldName] ?? fieldName}
          </label>
          {confidence !== null && (
            <span
              className={cn(
                'size-2 rounded-full',
                getConfidenceColor(confidence),
              )}
              title={`Konfidenz: ${Math.round(confidence)}%`}
              aria-label={`Konfidenz ${Math.round(confidence)}%`}
            />
          )}
          {fieldState.saving && (
            <span className="text-xs text-muted-foreground">Speichern...</span>
          )}
        </div>

        {fieldState.error && (
          <p className="text-xs text-destructive">{fieldState.error}</p>
        )}

        {fieldName === 'duration' ? (
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max={
                durationUnit === 'tage'
                  ? 30
                  : durationUnit === 'std'
                    ? 720
                    : 43200
              }
              step={durationUnit === 'tage' ? 0.5 : 1}
              value={durationDisplay}
              onChange={(e) => setDurationDisplay(e.target.value)}
              onBlur={handleDurationBlur}
              placeholder={hasValue ? undefined : 'Nicht erfasst'}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['min', 'std', 'tage'] as DurationUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleDurationUnitChange(unit)}
                  className={cn(
                    'px-3 py-2 text-xs transition-colors',
                    durationUnit === unit
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted',
                  )}
                >
                  {unit === 'min' ? 'Min' : unit === 'std' ? 'Std' : 'Tage'}
                </button>
              ))}
            </div>
          </div>
        ) : fieldName === 'symptom_time' ? (
          <input
            type="datetime-local"
            value={formatForDatetimeLocal(fieldState.value)}
            onChange={(e) => handleSymptomTimeChange(e.target.value)}
            onBlur={handleSymptomTimeBlur}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : fieldName === 'side' ? (
          <select
            value={fieldState.value}
            onChange={(e) => {
              const val = e.target.value
              setFields((prev) => ({
                ...prev,
                [fieldName]: { ...prev[fieldName], value: val },
              }))
            }}
            onBlur={() => handleBlur(fieldName)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Nicht erfasst</option>
            {SIDE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
        ) : fieldName === 'intensity' ? (
          <input
            type="number"
            min={1}
            max={10}
            value={fieldState.value}
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                [fieldName]: { ...prev[fieldName], value: e.target.value },
              }))
            }
            onBlur={() => handleBlur(fieldName)}
            placeholder="Nicht erfasst"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <input
            type="text"
            value={fieldState.value}
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                [fieldName]: { ...prev[fieldName], value: e.target.value },
              }))
            }
            onBlur={() => handleBlur(fieldName)}
            placeholder="Nicht erfasst"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
          aria-label="Zurück"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold">Symptom bearbeiten</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Original-Meldung */}
        {event.raw_input && (
          <div className="mb-6">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Ursprüngliche Meldung
            </p>
            <div className="rounded-xl bg-muted/50 px-4 py-3">
              <p className="text-sm text-foreground">{event.raw_input}</p>
            </div>
          </div>
        )}

        {/* Zeitpunkt & Dauer */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Zeitpunkt &amp; Dauer
          </h2>
          <div className="flex flex-col gap-4">
            {renderField('symptom_time')}
            {renderField('duration')}
          </div>
        </div>

        {/* Symptom-Details */}
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Symptom-Details
          </h2>
          <div className="flex flex-col gap-4">
            {renderField('symptom_name')}
            {renderField('body_region')}
            {renderField('side')}
            {renderField('symptom_type')}
            {renderField('intensity')}
          </div>
        </div>

        {/* Änderungshistorie */}
        <CorrectionHistory corrections={corrections} />
      </div>
    </div>
  )
}
