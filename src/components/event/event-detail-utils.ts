import type { ExtractedField } from '@/types/analytics'

/** Fields that belong to the whole event, not per-symptom group */
export const EVENT_LEVEL_FIELDS = new Set(['symptom_time', 'duration'])

export function groupBySymptomIndex(
  fields: ExtractedField[],
): Map<number, ExtractedField[]> {
  const groups = new Map<number, ExtractedField[]>()
  for (const field of fields) {
    const idx = field.symptomIndex ?? 0
    if (!groups.has(idx)) groups.set(idx, [])
    groups.get(idx)!.push(field)
  }
  return groups
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 85) return 'bg-green-500'
  if (confidence >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function formatSymptomTimestamp(isoString: string): string {
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDurationMinutes(minutesStr: string): string | null {
  const minutes = parseInt(minutesStr, 10)
  if (isNaN(minutes) || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0 && mins > 0) return `${hours} Std. ${mins} Min.`
  if (hours > 0) return `${hours} Std.`
  return `${minutes} Min.`
}

export function formatFieldValue(field: ExtractedField): string {
  if (!field.value) return 'Nicht erfasst'
  if (field.fieldName === 'intensity') return `${field.value}/10`
  if (field.fieldName === 'symptom_time')
    return formatSymptomTimestamp(field.value)
  if (field.fieldName === 'duration')
    return formatDurationMinutes(field.value) ?? field.value
  return field.value
}

export function formatDateTime(isoString: string): {
  date: string
  time: string
  combined: string
} {
  const d = new Date(isoString)
  const date = new Intl.DateTimeFormat('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return { date, time, combined: `${date}, ${time}` }
}
