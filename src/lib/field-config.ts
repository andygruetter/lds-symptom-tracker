/** Shared field configuration for extracted data display.
 * No 'use client' — safe to import from server and client code alike. */

export const FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptom',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Art',
  intensity: 'Stärke',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
  trigger: 'Auslöser',
  frequency: 'Häufigkeit',
  status: 'Verlauf',
  medication: 'Medikament',
  medication_name: 'Medikament',
  dosage: 'Dosierung',
  action: 'Aktion',
  reason: 'Grund',
}

/** Canonical display order for extracted fields */
export const FIELD_ORDER: string[] = [
  'symptom_name',
  'body_region',
  'side',
  'symptom_type',
  'intensity',
  'trigger',
  'frequency',
  'status',
  'symptom_time',
  'duration',
  'medication',
  'medication_name',
  'dosage',
  'reason',
  'action',
]

/** Returns human-readable label for a field name, falling back to the field_name itself */
export function getFieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName
}

/**
 * Sorts field names by FIELD_ORDER. Known fields come first (in order),
 * unknown fields are appended alphabetically.
 */
export function sortByFieldOrder(fieldNames: string[]): string[] {
  return [...fieldNames].sort((a, b) => {
    const ia = FIELD_ORDER.indexOf(a)
    const ib = FIELD_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}

/** Fields that are used as group title (displayName) and should be excluded from detail lists */
export const TITLE_FIELDS = new Set([
  'symptom_name',
  'medication',
  'medication_name',
])

/**
 * Sorts Object.entries by FIELD_ORDER, filtering out title fields.
 * Returns sorted [key, value] pairs ready for rendering.
 */
export function sortedDetailEntries(
  fields: Record<string, string>,
): [string, string][] {
  return Object.entries(fields)
    .filter(([k]) => !TITLE_FIELDS.has(k))
    .sort(([a], [b]) => {
      const ia = FIELD_ORDER.indexOf(a)
      const ib = FIELD_ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
}
