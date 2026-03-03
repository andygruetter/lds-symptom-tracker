import type { ClarificationQuestion, ExtractedData } from '@/types/ai'

const CONFIDENCE_THRESHOLD = 70
const MAX_QUESTIONS = 2

// Priorität: body_region > side > symptom_type > intensity > other
const FIELD_PRIORITY: Record<string, number> = {
  Körperregion: 1,
  Körperteil: 1,
  Seite: 2,
  Symptomtyp: 3,
  Intensität: 4,
}

function getFieldPriority(fieldName: string): number {
  return FIELD_PRIORITY[fieldName] ?? 5
}

interface ClarificationTemplate {
  question: string
  options: string[]
}

const clarificationTemplates: Record<string, ClarificationTemplate> = {
  Körperregion: {
    question: 'Welche Region genauer?',
    options: [
      'Oberer Rücken',
      'Unterer Rücken',
      'Schulterblatt',
      'Lendenbereich',
      'Nacken',
    ],
  },
  Körperteil: {
    question: 'Welcher Körperteil genauer?',
    options: ['Kopf', 'Rücken', 'Bein', 'Arm', 'Bauch', 'Brust'],
  },
  Seite: {
    question: 'Welche Seite?',
    options: ['Links', 'Rechts', 'Beidseits'],
  },
  Intensität: {
    question: 'Wie stark auf einer Skala von 1-10?',
    options: ['Leicht (1-3)', 'Mittel (4-6)', 'Stark (7-9)', 'Unerträglich (10)'],
  },
  Symptomtyp: {
    question: 'Wie fühlt es sich an?',
    options: ['Stechend', 'Ziehend', 'Dumpf', 'Brennend', 'Kribbelnd', 'Pochend'],
  },
}

function getDefaultTemplate(fieldName: string): ClarificationTemplate {
  return {
    question: `Kannst du "${fieldName}" genauer beschreiben?`,
    options: [],
  }
}

export function generateClarificationQuestions(
  fields: ExtractedData[],
): ClarificationQuestion[] {
  // 1. Filter: nur Felder mit confidence < 70%
  const uncertainFields = fields.filter(
    (f) => f.confidence < CONFIDENCE_THRESHOLD && !f.confirmed,
  )

  if (uncertainFields.length === 0) return []

  // 2. Sortiere nach Priorität (niedrigere Zahl = höhere Priorität)
  const sorted = [...uncertainFields].sort(
    (a, b) => getFieldPriority(a.field_name) - getFieldPriority(b.field_name),
  )

  // 3. Max 2 Fragen
  const selected = sorted.slice(0, MAX_QUESTIONS)

  // 4. Generiere Fragen
  return selected.map((field) => {
    const template =
      clarificationTemplates[field.field_name] ??
      getDefaultTemplate(field.field_name)

    return {
      fieldName: field.field_name,
      question: template.question,
      options: template.options,
      allowFreeText: true,
    }
  })
}
