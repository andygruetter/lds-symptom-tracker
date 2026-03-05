import type {
  ExtractionProvider,
  ExtractionResult,
  MultiExtractionResult,
} from '@/types/ai'

/**
 * Bekannte Symptome für deterministische Mock-Extraktion.
 */
const KNOWN_SYMPTOMS: Record<
  string,
  { name: string; region: string; fields: ExtractionResult['fields'] }
> = {
  kopfschmerzen: {
    name: 'Kopfschmerzen',
    region: 'Kopf',
    fields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Kopf', confidence: 90 },
    ],
  },
  kopfweh: {
    name: 'Kopfschmerzen',
    region: 'Kopf',
    fields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Kopf', confidence: 90 },
    ],
  },
  nackenschmerzen: {
    name: 'Nackenschmerzen',
    region: 'Nacken',
    fields: [
      { fieldName: 'symptom_name', value: 'Nackenschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Nacken', confidence: 90 },
    ],
  },
  rückenschmerzen: {
    name: 'Rückenschmerzen',
    region: 'Rücken',
    fields: [
      { fieldName: 'symptom_name', value: 'Rückenschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Rücken', confidence: 90 },
    ],
  },
  übelkeit: {
    name: 'Übelkeit',
    region: 'Magen',
    fields: [
      { fieldName: 'symptom_name', value: 'Übelkeit', confidence: 95 },
      { fieldName: 'body_region', value: 'Magen', confidence: 90 },
    ],
  },
}

/**
 * Splittet Eingabe an "und", "," und "sowie" und matcht bekannte Symptome.
 */
function parseMultiSymptom(rawInput: string): ExtractionResult[] {
  const lower = rawInput.toLowerCase()
  const parts = lower.split(/\s*(?:und|sowie|,)\s*/).filter(Boolean)

  const results: ExtractionResult[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    for (const [keyword, symptom] of Object.entries(KNOWN_SYMPTOMS)) {
      if (trimmed.includes(keyword)) {
        results.push({
          eventType: 'symptom',
          fields: [...symptom.fields],
        })
        break
      }
    }
  }

  return results
}

/**
 * E2E Mock Provider — deterministische Extraktion ohne Claude API.
 * Aktiviert via E2E_MOCK_EXTRACTION=true.
 */
export const mockProvider: ExtractionProvider = {
  async extract(rawInput: string): Promise<MultiExtractionResult> {
    const lower = rawInput.toLowerCase()
    const isMedication =
      /ibuprofen|paracetamol|aspirin|medikament|tablette|eingenommen|vergessen/.test(
        lower,
      )

    if (isMedication) {
      return [
        {
          eventType: 'medication',
          fields: [
            {
              fieldName: 'medication_name',
              value: 'Ibuprofen',
              confidence: 95,
            },
            { fieldName: 'action', value: 'eingenommen', confidence: 90 },
            { fieldName: 'dosage', value: '400mg', confidence: 80 },
          ],
        },
      ]
    }

    // Multi-Symptom: Trenne an "und", "," etc.
    const multiResults = parseMultiSymptom(rawInput)
    if (multiResults.length > 0) {
      return multiResults
    }

    // Fallback: einzelnes Symptom
    return [
      {
        eventType: 'symptom',
        fields: [
          { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
          { fieldName: 'body_region', value: 'Kopf', confidence: 90 },
          { fieldName: 'Seite', value: 'rechts', confidence: 75 },
          { fieldName: 'Symptomtyp', value: 'stechend', confidence: 60 },
        ],
      },
    ]
  },
}
