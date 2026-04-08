import type { ExtractionProvider, ExtractionResult } from '@/types/ai'

/**
 * E2E Mock Provider — deterministische Extraktion ohne Claude API.
 * Aktiviert via E2E_MOCK_EXTRACTION=true.
 */
export const mockProvider: ExtractionProvider = {
  async extract(rawInput: string): Promise<ExtractionResult> {
    const lower = rawInput.toLowerCase()
    const hasMedication =
      /ibuprofen|paracetamol|dafalgan|aspirin|novalgin|triptan|tablette|eingenommen/.test(
        lower,
      )
    const hasPrecursor = /aura|vorzeichen|vorbote|druckgefühl|lichtblitz/.test(
      lower,
    )

    const fields: ExtractionResult['fields'] = [
      {
        fieldName: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        symptomIndex: 0,
        medicationIndex: null,
      },
      {
        fieldName: 'body_region',
        value: 'Kopf',
        confidence: 90,
        symptomIndex: 0,
        medicationIndex: null,
      },
      {
        fieldName: 'status',
        value: 'active',
        confidence: 90,
        symptomIndex: 0,
        medicationIndex: null,
      },
    ]

    if (hasPrecursor) {
      fields.push({
        fieldName: 'precursor',
        value: 'Aura',
        confidence: 90,
        symptomIndex: 0,
        medicationIndex: null,
      })
    }

    if (hasMedication) {
      fields.push(
        {
          fieldName: 'medication_taken',
          value: 'Ibuprofen',
          confidence: 95,
          symptomIndex: 0,
          medicationIndex: 0,
        },
        {
          fieldName: 'medication_dosage',
          value: '400mg',
          confidence: 85,
          symptomIndex: 0,
          medicationIndex: 0,
        },
      )
    }

    return { fields }
  },
}
