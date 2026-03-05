import type { ExtractionResult, MultiExtractionResult } from '@/types/ai'

export const symptomExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
    { fieldName: 'body_region', value: 'Kopf', confidence: 95 },
    { fieldName: 'side', value: 'rechts', confidence: 90 },
    { fieldName: 'symptom_type', value: 'stechend', confidence: 75 },
  ],
}

export const medicationExtraction: ExtractionResult = {
  eventType: 'medication',
  fields: [
    { fieldName: 'medication_name', value: 'Ibuprofen', confidence: 95 },
    { fieldName: 'action', value: 'eingenommen', confidence: 90 },
    { fieldName: 'dosage', value: '400mg', confidence: 85 },
  ],
}

export const lowConfidenceExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    { fieldName: 'symptom_name', value: 'Unwohlsein', confidence: 60 },
    { fieldName: 'body_region', value: 'Magen', confidence: 55 },
  ],
}

// Multi-Symptom: "Kopfschmerzen und Nackenschmerzen"
export const multiSymptomExtraction: MultiExtractionResult = [
  {
    eventType: 'symptom',
    fields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Kopf', confidence: 95 },
    ],
  },
  {
    eventType: 'symptom',
    fields: [
      { fieldName: 'symptom_name', value: 'Nackenschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Nacken', confidence: 95 },
    ],
  },
]

// Einzelnes Symptom als MultiExtractionResult (Normalfall)
export const singleSymptomMultiResult: MultiExtractionResult = [
  symptomExtraction,
]

export const singleMedicationMultiResult: MultiExtractionResult = [
  medicationExtraction,
]
