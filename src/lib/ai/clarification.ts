import type { ClarificationQuestion, ExtractedData } from '@/types/ai'

const CONFIDENCE_THRESHOLD = 70
const MAX_QUESTIONS = 2

// Priorität: symptom_time > body_region > side > symptom_type > intensity > duration > other
// Keys matchen Claude-Output (englische field_name Werte)
const FIELD_PRIORITY: Record<string, number> = {
  symptom_time: 0,
  body_region: 1,
  side: 2,
  symptom_type: 3,
  intensity: 4,
  symptom_name: 5,
  duration: 6,
}

function getFieldPriority(fieldName: string): number {
  return FIELD_PRIORITY[fieldName] ?? 7
}

interface ClarificationTemplate {
  question: string
  options: string[]
}

const clarificationTemplates: Record<string, ClarificationTemplate> = {
  symptom_name: {
    question: 'Welches Symptom hast du?',
    options: [
      'Kopfschmerzen',
      'Rückenschmerzen',
      'Übelkeit',
      'Schwindel',
      'Müdigkeit',
      'Herzrasen',
    ],
  },
  symptom_time: {
    question: 'Wann genau ist das Symptom aufgetreten?',
    options: ['Gerade eben', 'Vor 1 Stunde', 'Heute Morgen', 'Gestern'],
  },
  body_region: {
    question: 'Welche Region genauer?',
    options: [
      'Oberer Rücken',
      'Unterer Rücken',
      'Schulterblatt',
      'Lendenbereich',
      'Nacken',
    ],
  },
  side: {
    question: 'Welche Seite?',
    options: ['Links', 'Rechts', 'Beidseits'],
  },
  intensity: {
    question: 'Wie stark auf einer Skala von 1-10?',
    options: [
      'Leicht (1-3)',
      'Mittel (4-6)',
      'Stark (7-9)',
      'Unerträglich (10)',
    ],
  },
  symptom_type: {
    question: 'Wie fühlt es sich an?',
    options: [
      'Stechend',
      'Ziehend',
      'Dumpf',
      'Brennend',
      'Kribbelnd',
      'Pochend',
    ],
  },
  duration: {
    question: 'Wie lange hat das Symptom angedauert?',
    options: [
      'Wenige Minuten',
      '30 Minuten',
      '1 Stunde',
      'Mehrere Stunden',
      'Mehrere Tage',
    ],
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
