import type { ExtractionResult, MultiExtractionResult } from '@/types/ai'

export const symptomExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
    { fieldName: 'body_region', value: 'Kopf', confidence: 95 },
    { fieldName: 'side', value: 'rechts', confidence: 90 },
    { fieldName: 'symptom_type', value: 'stechend', confidence: 75 },
    { fieldName: 'aktivitaet_kategorie', value: 'Arbeit', confidence: 80 },
    { fieldName: 'aktivitaet_zeitbezug', value: 'waehrend', confidence: 85 },
    { fieldName: 'bemerkungen', value: 'Bildschirmarbeit', confidence: 75 },
  ],
}

export const symptomWithActivityExtraction: ExtractionResult = {
  eventType: 'symptom',
  fields: [
    { fieldName: 'symptom_name', value: 'Brustschmerzen', confidence: 95 },
    { fieldName: 'body_region', value: 'Brust', confidence: 95 },
    {
      fieldName: 'aktivitaet_kategorie',
      value: 'Sport / Bewegung',
      confidence: 85,
    },
    { fieldName: 'aktivitaet_zeitbezug', value: 'nach', confidence: 90 },
    {
      fieldName: 'bemerkungen',
      value: '- Hiphop tanzen\n- Draussen bei Kaelte',
      confidence: 80,
    },
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

// Multi-Symptom: "Kopfschmerzen und Nackenschmerzen nach dem Sport"
export const multiSymptomExtraction: MultiExtractionResult = [
  {
    eventType: 'symptom',
    fields: [
      { fieldName: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { fieldName: 'body_region', value: 'Kopf', confidence: 95 },
      {
        fieldName: 'aktivitaet_kategorie',
        value: 'Sport / Bewegung',
        confidence: 80,
      },
      { fieldName: 'aktivitaet_zeitbezug', value: 'nach', confidence: 85 },
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
