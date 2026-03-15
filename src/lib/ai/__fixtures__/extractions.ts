import type { ExtractionResult } from '@/types/ai'

export const symptomExtraction: ExtractionResult = {
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
      confidence: 95,
      symptomIndex: 0,
    },
    {
      fieldName: 'side',
      value: 'rechts',
      confidence: 90,
      symptomIndex: 0,
    },
    {
      fieldName: 'symptom_type',
      value: 'stechend',
      confidence: 75,
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

export const medicationExtraction: ExtractionResult = {
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
      confidence: 85,
      symptomIndex: 0,
    },
  ],
}

export const lowConfidenceExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Unwohlsein',
      confidence: 60,
      symptomIndex: 0,
    },
    {
      fieldName: 'body_region',
      value: 'Magen',
      confidence: 55,
      symptomIndex: 0,
    },
  ],
}

export const multiSymptomExtraction: ExtractionResult = {
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
      fieldName: 'status',
      value: 'worsening',
      confidence: 85,
      symptomIndex: 0,
    },
    {
      fieldName: 'symptom_name',
      value: 'Übelkeit',
      confidence: 85,
      symptomIndex: 1,
    },
    {
      fieldName: 'trigger',
      value: 'nach dem Joggen',
      confidence: 90,
      symptomIndex: 0,
    },
  ],
}

export const resolvedSymptomExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Rückenschmerzen',
      confidence: 95,
      symptomIndex: 0,
    },
    {
      fieldName: 'body_region',
      value: 'Rücken',
      confidence: 80,
      symptomIndex: 0,
    },
    {
      fieldName: 'status',
      value: 'resolved',
      confidence: 95,
      symptomIndex: 0,
    },
  ],
}
