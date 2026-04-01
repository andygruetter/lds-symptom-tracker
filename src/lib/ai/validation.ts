import type { ExtractionField } from '@/types/ai'

const VALID_SIDES = new Set(['links', 'rechts', 'beidseits'])

const VALID_STATUSES = new Set(['active', 'resolved', 'improving', 'worsening'])

const NUMERIC_FIELDS: Record<string, { min: number; max: number }> = {
  intensity: { min: 1, max: 10 },
  duration: { min: 0, max: 43200 }, // max 30 Tage in Minuten
}

/**
 * Post-Extraction-Validation: Prüft und korrigiert extrahierte Felder.
 * - Ungültige Enum-Werte → Konfidenz auf 0 senken (wird durch Threshold gefiltert)
 * - Numerische Felder → Range-Check, Clamp oder Konfidenz senken
 * - ISO-8601 symptom_time → Validierung
 */
export function validateExtractionFields(
  fields: ExtractionField[],
): ExtractionField[] {
  return fields
    .map((field) => validateField(field))
    .filter((field) => field.confidence > 0)
}

function validateField(field: ExtractionField): ExtractionField {
  switch (field.fieldName) {
    case 'side':
      return validateEnum(field, VALID_SIDES)

    case 'status':
      return validateEnum(field, VALID_STATUSES)

    case 'intensity':
    case 'duration':
      return validateNumeric(field)

    case 'symptom_time':
      return validateIsoTimestamp(field)

    default:
      return field
  }
}

function validateEnum(
  field: ExtractionField,
  validValues: Set<string>,
): ExtractionField {
  const normalized = field.value.toLowerCase().trim()
  if (validValues.has(normalized)) {
    return { ...field, value: normalized }
  }
  // Ungültiger Wert → Konfidenz auf 0 (wird rausgefiltert)
  return { ...field, confidence: 0 }
}

function validateNumeric(field: ExtractionField): ExtractionField {
  const range = NUMERIC_FIELDS[field.fieldName]
  if (!range) return field

  const num = parseInt(field.value, 10)
  if (isNaN(num)) {
    return { ...field, confidence: 0 }
  }

  if (num < range.min || num > range.max) {
    // Wert ausserhalb Range → Konfidenz stark senken
    const clamped = Math.max(range.min, Math.min(range.max, num))
    return {
      ...field,
      value: String(clamped),
      confidence: Math.min(field.confidence, 40),
    }
  }

  return field
}

function validateIsoTimestamp(field: ExtractionField): ExtractionField {
  const parsed = new Date(field.value)
  if (isNaN(parsed.getTime())) {
    return { ...field, confidence: 0 }
  }

  // Zukunfts-Check: Symptomzeit sollte nicht in der Zukunft liegen
  const now = new Date()
  if (parsed.getTime() > now.getTime() + 60 * 60 * 1000) {
    // Mehr als 1h in der Zukunft → wahrscheinlich Parsing-Fehler
    return { ...field, confidence: Math.min(field.confidence, 30) }
  }

  return field
}
