import { FIELD_LABELS } from '@/lib/field-config'
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
  trigger: 7,
  frequency: 8,
  status: 9,
}

function getFieldPriority(fieldName: string): number {
  return FIELD_PRIORITY[fieldName] ?? 10
}

interface ClarificationTemplate {
  question: string | ((extractedValue?: string) => string)
  options: string[] | ((extractedValue?: string) => string[])
}

// Dynamische Optionen basierend auf extrahiertem Wert
const BODY_REGION_SUBOPTIONS: Record<string, string[]> = {
  kopf: ['Stirn', 'Schläfe', 'Hinterkopf', 'Scheitel'],
  rücken: [
    'Oberer Rücken',
    'Zwischen Schulterblättern',
    'Unterer Rücken',
    'Lendenbereich',
    'Kreuzbein',
  ],
  bauch: ['Oberbauch', 'Unterbauch', 'Links', 'Rechts'],
  brust: ['Brustbein', 'Herz-Bereich', 'Seitlich', 'Überall'],
  bein: [
    'Oberschenkel',
    'Knie',
    'Unterschenkel',
    'Wade',
    'Sprunggelenk',
    'Fuss',
  ],
  arm: ['Oberarm', 'Unterarm', 'Ellbogen', 'Handgelenk', 'Hand'],
  schulter: ['Vorne', 'Hinten', 'Seitlich'],
  gelenk: [
    'Schulter',
    'Knie',
    'Handgelenk',
    'Sprunggelenk',
    'Hüfte',
    'Kiefergelenk',
  ],
  fuss: ['Fusssohle', 'Fussrücken', 'Sprunggelenk', 'Zehen'],
  auge: ['Beide Augen', 'Nur ein Auge', 'Hinter dem Auge'],
  hals: ['Nacken', 'Halsschlagader', 'Halswirbelsäule', 'Kehlkopf'],
  nacken: ['Oberer Nacken', 'Unterer Nacken', 'Halswirbelsäule', 'Seitlich'],
  ohr: ['Im Ohr', 'Hinter dem Ohr', 'Rauschen/Pulsierend', 'Pfeifen/Sausen'],
}

function getBodyRegionOptions(extractedValue?: string): string[] {
  if (!extractedValue) {
    return [
      'Kopf',
      'Nacken',
      'Schulter',
      'Rücken',
      'Brust',
      'Bauch',
      'Gelenk',
      'Bein',
      'Arm',
      'Auge',
    ]
  }

  const lower = extractedValue.toLowerCase()
  for (const [key, options] of Object.entries(BODY_REGION_SUBOPTIONS)) {
    if (lower.includes(key)) {
      return options
    }
  }

  return ['Oberer Bereich', 'Unterer Bereich', 'Links', 'Rechts', 'Mitte']
}

const clarificationTemplates: Record<string, ClarificationTemplate> = {
  symptom_name: {
    question: 'Welches Symptom hast du?',
    options: [
      'Kopfschmerzen',
      'Rückenschmerzen',
      'Gelenkschmerzen',
      'Brustschmerzen',
      'Schwindel',
      'Herzrasen',
      'Müdigkeit',
      'Atemnot',
      'Sehstörungen',
      'Ohrgeräusche',
    ],
  },
  symptom_time: {
    question: 'Wann genau ist das Symptom aufgetreten?',
    options: ['Gerade eben', 'Vor 1 Stunde', 'Heute Morgen', 'Gestern'],
  },
  body_region: {
    question: (value) =>
      value
        ? `Du hast '${value}' gesagt — kannst du die Region genauer eingrenzen?`
        : 'Welche Region genauer?',
    options: (value) => getBodyRegionOptions(value),
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
    question: (value) =>
      value
        ? `Du hast es als '${value}' beschrieben — wie fühlt es sich genauer an?`
        : 'Wie fühlt es sich an?',
    options: [
      'Stechend',
      'Ziehend',
      'Dumpf',
      'Brennend',
      'Pochend',
      'Reissend',
      'Drückend',
      'Kribbelnd',
    ],
  },
  trigger: {
    question: 'Was hast du gemacht als das Symptom aufgetreten ist?',
    options: [
      'Sport / Bewegung',
      'Arbeit / Bildschirm',
      'Nach dem Essen',
      'Beim Aufstehen',
      'In Ruhe',
      'Wetterwechsel',
      'Stress',
    ],
  },
  frequency: {
    question: 'Wie oft tritt das Symptom auf?',
    options: [
      'Erstmalig',
      'Gelegentlich',
      'Täglich',
      'Mehrmals täglich',
      'Seit mehreren Tagen',
    ],
  },
}

function getDefaultTemplate(fieldName: string): ClarificationTemplate {
  const label = FIELD_LABELS[fieldName] ?? fieldName
  return {
    question: `Kannst du "${label}" genauer beschreiben?`,
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

  // 4. Generiere kontextabhängige Fragen
  return selected.map((field) => {
    const template =
      clarificationTemplates[field.field_name] ??
      getDefaultTemplate(field.field_name)

    const question =
      typeof template.question === 'function'
        ? template.question(field.value)
        : template.question

    const options =
      typeof template.options === 'function'
        ? template.options(field.value)
        : template.options

    return {
      fieldName: field.field_name,
      question,
      options,
      allowFreeText: true,
    }
  })
}
