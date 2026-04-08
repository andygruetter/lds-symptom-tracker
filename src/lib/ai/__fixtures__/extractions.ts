import type { ExtractionResult } from '@/types/ai'

export const symptomExtraction: ExtractionResult = {
  fields: [
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
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'side',
      value: 'rechts',
      confidence: 90,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'symptom_type',
      value: 'stechend',
      confidence: 75,
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
  ],
}

export const lowConfidenceExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Unwohlsein',
      confidence: 60,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'body_region',
      value: 'Magen',
      confidence: 55,
      symptomIndex: 0,
      medicationIndex: null,
    },
  ],
}

export const multiSymptomExtraction: ExtractionResult = {
  fields: [
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
      value: 'worsening',
      confidence: 85,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'symptom_name',
      value: 'Übelkeit',
      confidence: 85,
      symptomIndex: 1,
      medicationIndex: null,
    },
    {
      fieldName: 'trigger',
      value: 'nach dem Joggen',
      confidence: 90,
      symptomIndex: 0,
      medicationIndex: null,
    },
  ],
}

export const resolvedSymptomExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Rückenschmerzen',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'body_region',
      value: 'Rücken',
      confidence: 80,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'status',
      value: 'resolved',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
  ],
}

export const symptomWithPrecursorExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Migräne',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'precursor',
      value: 'Aura',
      confidence: 95,
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
  ],
}

export const symptomWithMedicationExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Kopfschmerzen',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'status',
      value: 'active',
      confidence: 85,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'medication_taken',
      value: 'Dafalgan',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 0,
    },
    {
      fieldName: 'medication_dosage',
      value: '1g',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 0,
    },
  ],
}

export const symptomWithMultiMedicationExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Kopfschmerzen',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
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
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 0,
    },
    {
      fieldName: 'medication_taken',
      value: 'Paracetamol',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 1,
    },
    {
      fieldName: 'medication_dosage',
      value: '500mg',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 1,
    },
  ],
}

export const fullSymptomExtraction: ExtractionResult = {
  fields: [
    {
      fieldName: 'symptom_name',
      value: 'Migräne',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'precursor',
      value: 'Aura',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: null,
    },
    {
      fieldName: 'intensity',
      value: '8',
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
    {
      fieldName: 'medication_taken',
      value: 'Dafalgan',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 0,
    },
    {
      fieldName: 'medication_dosage',
      value: '1g',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 0,
    },
    {
      fieldName: 'medication_taken',
      value: 'Ibuprofen',
      confidence: 95,
      symptomIndex: 0,
      medicationIndex: 1,
    },
    {
      fieldName: 'medication_dosage',
      value: '400mg',
      confidence: 90,
      symptomIndex: 0,
      medicationIndex: 1,
    },
  ],
}
