'use client'

import { useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import { X } from 'lucide-react'

import { CorrectionHistory } from '@/components/event/correction-history'
import { correctExtractedField } from '@/lib/actions/symptom-actions'
import { FIELD_LABELS as BASE_FIELD_LABELS } from '@/lib/field-config'
import { cn } from '@/lib/utils'
import type { ExtractedData } from '@/types/ai'
import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

type Correction = Database['public']['Tables']['corrections']['Row']

type DurationUnit = 'min' | 'std' | 'tage'

// Edit-form uses a local override for intensity label (with range hint)
const FIELD_LABELS: Record<string, string> = {
  ...BASE_FIELD_LABELS,
  intensity: 'Intensität (1–10)',
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

function groupByMedicationIndex(
  fields: ExtractedData[],
): Map<number, ExtractedData[]> {
  const groups = new Map<number, ExtractedData[]>()
  for (const field of fields) {
    if (field.medication_index === null) continue
    const idx = field.medication_index
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return groups
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

  const symptomGroups = groupBySymptomIndex(extractedFields)
  const isMultiSymptom = symptomGroups.length > 1
  const medicationGroups = groupByMedicationIndex(extractedFields)
  const sortedMedKeys = [...medicationGroups.keys()].sort((a, b) => a - b)

  // Build keyed field maps: "fieldName" for single, "fieldName:index" for multi
  // Medication fields use "med:medIdx:fieldName" prefix
  function fieldKey(
    name: string,
    symptomIndex: number,
    medicationIndex: number | null = null,
  ): string {
    if (medicationIndex !== null) return `med:${medicationIndex}:${name}`
    return isMultiSymptom ? `${name}:${symptomIndex}` : name
  }

  // Build initial values map from extracted fields
  const buildFieldMap = () => {
    const map: Record<string, ExtractedData> = {}
    for (const group of symptomGroups) {
      const idx = group[0]?.symptom_index ?? 0
      for (const f of group) {
        map[fieldKey(f.field_name, idx)] = f
      }
    }
    for (const [medIdx, medFields] of medicationGroups) {
      for (const f of medFields) {
        map[fieldKey(f.field_name, 0, medIdx)] = f
      }
    }
    return map
  }

  const fieldMap = buildFieldMap()

  // Build all keys: symptom fields + medication fields
  const symptomKeys = isMultiSymptom
    ? symptomGroups.flatMap((group) => {
        const idx = group[0]?.symptom_index ?? 0
        return allFieldNames.map((name) => fieldKey(name, idx))
      })
    : allFieldNames

  const medicationKeys = sortedMedKeys.flatMap((medIdx) =>
    ['medication_taken', 'medication_dosage'].map((name) =>
      fieldKey(name, 0, medIdx),
    ),
  )

  const allKeys = [...symptomKeys, ...medicationKeys]

  const initialValues = useRef<Record<string, string>>(
    Object.fromEntries(allKeys.map((key) => [key, fieldMap[key]?.value ?? ''])),
  )

  const [fields, setFields] = useState<Record<string, FieldState>>(
    Object.fromEntries(
      allKeys.map((key) => [
        key,
        {
          value: fieldMap[key]?.value ?? '',
          saving: false,
          error: null,
        },
      ]),
    ),
  )

  // Duration unit state (use first symptom group's duration)
  const durationKey = isMultiSymptom
    ? fieldKey('duration', symptomGroups[0]?.[0]?.symptom_index ?? 0)
    : 'duration'
  const durationInitial = parseDuration(fieldMap[durationKey]?.value ?? '')
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

  const saveField = async (
    key: string,
    fieldName: string,
    newValue: string,
    symptomIndex: number = 0,
    medicationIndex: number | null = null,
  ) => {
    // F8-Fix: Dirty-Check — nur bei tatsächlicher Änderung speichern
    if (newValue === initialValues.current[key]) return
    if (!newValue.trim()) {
      // Felder können nicht geleert werden — Display auf ursprünglichen Wert zurücksetzen
      setFields((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          value: initialValues.current[key],
        },
      }))
      return
    }

    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], saving: true, error: null },
    }))

    const result = await correctExtractedField({
      eventId: event.id,
      fieldName,
      newValue,
      symptomIndex,
      medicationIndex,
    })

    if (result.error) {
      setFields((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          saving: false,
          error: result.error!.error,
        },
      }))
    } else {
      // Update initial value so next blur doesn't re-save
      initialValues.current[key] = newValue
      setFields((prev) => ({
        ...prev,
        [key]: { ...prev[key], saving: false, error: null },
      }))
    }
  }

  const handleBlur = (
    key: string,
    fieldName: string,
    symptomIndex: number = 0,
    medicationIndex: number | null = null,
  ) => {
    const value = fields[key].value
    saveField(key, fieldName, value, symptomIndex, medicationIndex)
  }

  const handleDurationBlur = (symptomIndex: number = 0) => {
    const minutes = durationToMinutes(durationDisplay, durationUnit)
    const key = fieldKey('duration', symptomIndex)
    if (minutes) {
      setFields((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: minutes },
      }))
      saveField(key, 'duration', minutes, symptomIndex)
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

  const handleSymptomTimeChange = (key: string, datetimeLocalValue: string) => {
    // Convert datetime-local to ISO-8601 with timezone offset
    if (!datetimeLocalValue) {
      setFields((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: '' },
      }))
      return
    }
    // Keep as ISO-8601
    const isoValue = new Date(datetimeLocalValue).toISOString()
    setFields((prev) => ({
      ...prev,
      [key]: { ...prev[key], value: isoValue },
    }))
  }

  const handleSymptomTimeBlur = (key: string, symptomIndex: number = 0) => {
    saveField(key, 'symptom_time', fields[key].value, symptomIndex)
  }

  const renderField = (
    fieldName: string,
    symptomIndex: number = 0,
    medicationIndex: number | null = null,
  ) => {
    const key = fieldKey(fieldName, symptomIndex, medicationIndex)
    const fieldState = fields[key]
    if (!fieldState) return null
    const extractedField = fieldMap[key]
    const hasValue = !!fieldState.value
    const confidence = extractedField?.confidence ?? null
    const isLowConfidence = confidence !== null && confidence < 70

    return (
      <div key={key} className="flex flex-col gap-1.5">
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

        {isLowConfidence && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Bitte prüfen — KI unsicher ({Math.round(confidence!)}%)
          </p>
        )}

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
              onBlur={() => handleDurationBlur(symptomIndex)}
              placeholder={hasValue ? undefined : 'Nicht erfasst'}
              className="h-14 flex-1 rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex overflow-hidden rounded-xl border border-border">
              {(['min', 'std', 'tage'] as DurationUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => handleDurationUnitChange(unit)}
                  className={cn(
                    'h-14 min-w-[56px] px-4 text-sm font-medium transition-colors',
                    durationUnit === unit
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground active:bg-muted',
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
            onChange={(e) => handleSymptomTimeChange(key, e.target.value)}
            onBlur={() => handleSymptomTimeBlur(key, symptomIndex)}
            className="h-14 rounded-xl border border-border bg-background px-4 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : fieldName === 'side' ? (
          <div className="flex overflow-hidden rounded-xl border border-border">
            {[
              { value: 'links', label: 'Links' },
              { value: 'beidseits', label: 'Beidseits' },
              { value: 'rechts', label: 'Rechts' },
            ].map(({ value, label }, i, arr) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  const next = fieldState.value === value ? '' : value
                  setFields((prev) => ({
                    ...prev,
                    [key]: { ...prev[key], value: next },
                  }))
                  saveField(key, fieldName, next, symptomIndex, medicationIndex)
                }}
                className={cn(
                  'h-14 flex-1 text-sm font-medium transition-colors',
                  i < arr.length - 1 && 'border-r border-border',
                  fieldState.value === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground active:bg-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : fieldName === 'intensity' ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Kaum spürbar
              </span>
              <span className="text-xl font-semibold text-foreground">
                {fieldState.value || '–'}
              </span>
              <span className="text-xs text-muted-foreground">
                Unerträglich
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={fieldState.value ? parseInt(fieldState.value) : 5}
              onChange={(e) =>
                setFields((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], value: e.target.value },
                }))
              }
              onPointerUp={() =>
                handleBlur(key, fieldName, symptomIndex, medicationIndex)
              }
              onTouchEnd={() =>
                handleBlur(key, fieldName, symptomIndex, medicationIndex)
              }
              className="h-2 w-full cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        ) : (
          <input
            type="text"
            value={fieldState.value}
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                [key]: { ...prev[key], value: e.target.value },
              }))
            }
            onBlur={() =>
              handleBlur(key, fieldName, symptomIndex, medicationIndex)
            }
            placeholder="Nicht erfasst"
            className="h-14 rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors active:bg-muted/80"
          aria-label="Schliessen"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">
          Symptom bearbeiten
        </h1>
        {/* Spacer to center title */}
        <div className="size-11" aria-hidden="true" />
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

        {isMultiSymptom ? (
          <>
            {/* Zeitpunkt & Dauer — shared across symptoms (from first group) */}
            <div className="mb-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Zeitpunkt &amp; Dauer
              </h2>
              <div className="flex flex-col gap-4">
                {renderField(
                  'symptom_time',
                  symptomGroups[0]?.[0]?.symptom_index ?? 0,
                )}
                {renderField(
                  'duration',
                  symptomGroups[0]?.[0]?.symptom_index ?? 0,
                )}
              </div>
            </div>

            {/* Per-symptom detail sections */}
            {symptomGroups.map((group, i) => {
              const idx = group[0]?.symptom_index ?? 0
              const groupFieldMap = Object.fromEntries(
                group.map((f) => [f.field_name, f]),
              )
              const symptomLabel =
                groupFieldMap['symptom_name']?.value ?? `Symptom ${i + 1}`

              return (
                <div key={idx} className="mb-5">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    {symptomLabel}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {allFieldNames
                      .filter(
                        (name) =>
                          name !== 'symptom_time' &&
                          name !== 'duration' &&
                          name !== 'medication_taken' &&
                          name !== 'medication_dosage',
                      )
                      .map((name) => renderField(name, idx))}
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <div className="mb-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Symptom-Details
            </h2>
            <div className="flex flex-col gap-4">
              {allFieldNames
                .filter(
                  (name) =>
                    name !== 'medication_taken' && name !== 'medication_dosage',
                )
                .map((name) => renderField(name))}
            </div>
          </div>
        )}

        {/* Medikamenten-Gruppen */}
        {sortedMedKeys.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Medikamente
            </h2>
            <div className="flex flex-col gap-5">
              {sortedMedKeys.map((medIdx, i) => (
                <div key={medIdx}>
                  {sortedMedKeys.length > 1 && (
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Medikament {i + 1}
                    </p>
                  )}
                  <div className="flex flex-col gap-4">
                    {renderField('medication_taken', 0, medIdx)}
                    {renderField('medication_dosage', 0, medIdx)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Änderungshistorie */}
        <CorrectionHistory corrections={corrections} />

        {/* Scroll-Puffer für fixierten Footer */}
        <div className="h-4" aria-hidden="true" />
      </div>

      {/* Fixierter Footer */}
      <div className="shrink-0 border-t border-border bg-background px-4 pb-[env(safe-area-inset-bottom)] pt-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-opacity active:opacity-80"
        >
          Fertig
        </button>
      </div>
    </div>
  )
}
