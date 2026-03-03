import type { ExtractionProvider, ExtractionResult } from '@/types/ai'

/**
 * E2E Mock Provider — deterministische Extraktion ohne Claude API.
 * Aktiviert via E2E_MOCK_EXTRACTION=true.
 */
export const mockProvider: ExtractionProvider = {
  async extract(rawInput: string): Promise<ExtractionResult> {
    const lower = rawInput.toLowerCase()
    const isMedication =
      /ibuprofen|paracetamol|aspirin|medikament|tablette|eingenommen|vergessen/.test(
        lower,
      )

    if (isMedication) {
      return {
        eventType: 'medication',
        fields: [
          { fieldName: 'medication_name', value: 'Ibuprofen', confidence: 95 },
          { fieldName: 'action', value: 'eingenommen', confidence: 90 },
          { fieldName: 'dosage', value: '400mg', confidence: 80 },
        ],
      }
    }

    return {
      eventType: 'symptom',
      fields: [
        { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
        { fieldName: 'Körperregion', value: 'Kopf', confidence: 90 },
        { fieldName: 'Seite', value: 'rechts', confidence: 75 },
        { fieldName: 'Symptomtyp', value: 'stechend', confidence: 60 },
      ],
    }
  },
}
