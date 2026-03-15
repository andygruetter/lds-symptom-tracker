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
          {
            fieldName: 'medication_name',
            value: 'Ibuprofen',
            confidence: 95,
            symptomIndex: 0,
          },
          {
            fieldName: 'action',
            value: 'eingenommen',
            confidence: 90,
            symptomIndex: 0,
          },
          {
            fieldName: 'dosage',
            value: '400mg',
            confidence: 80,
            symptomIndex: 0,
          },
        ],
      }
    }

    return {
      eventType: 'symptom',
      fields: [
        {
          fieldName: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 95,
          symptomIndex: 0,
        },
        {
          fieldName: 'body_region',
          value: 'Kopf',
          confidence: 90,
          symptomIndex: 0,
        },
        {
          fieldName: 'side',
          value: 'rechts',
          confidence: 75,
          symptomIndex: 0,
        },
        {
          fieldName: 'symptom_type',
          value: 'stechend',
          confidence: 60,
          symptomIndex: 0,
        },
        {
          fieldName: 'status',
          value: 'active',
          confidence: 90,
          symptomIndex: 0,
        },
      ],
    }
  },
}
