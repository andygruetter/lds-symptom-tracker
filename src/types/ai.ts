import { z } from 'zod/v4'

import type { Database } from '@/types/database'

// DB Row Type
export type ExtractedData =
  Database['public']['Tables']['extracted_data']['Row']

// KI-Pipeline Types
export interface ExtractionField {
  fieldName: string
  value: string
  confidence: number
  symptomIndex: number
  medicationIndex: number | null
}

export interface ExtractionResult {
  fields: ExtractionField[]
}

// Zod Schema für Claude Tool-Output Validation
// value kann null sein wenn Claude unsicher ist — diese Felder werden rausgefiltert
const rawExtractionFieldSchema = z.object({
  fieldName: z.string(),
  value: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  symptomIndex: z.number().int().min(0).optional().default(0),
  medicationIndex: z.number().int().min(0).nullable().optional().default(null),
})

export const extractionFieldSchema = z.object({
  fieldName: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(100),
  symptomIndex: z.number().int().min(0).default(0),
  medicationIndex: z.number().int().min(0).nullable().default(null),
})

export const extractionResultSchema = z.object({
  fields: z
    .array(rawExtractionFieldSchema)
    .min(1)
    .transform((fields) =>
      fields.filter(
        (
          f,
        ): f is {
          fieldName: string
          value: string
          confidence: number
          symptomIndex: number
          medicationIndex: number | null
        } => f.value !== null,
      ),
    ),
})

// Correction Type (für KI-Lernen aus Korrekturen)
export interface Correction {
  fieldName: string
  originalValue: string | null
  correctedValue: string
}

// Vocabulary Entry (persönliches Symptom-Vokabular)
export interface VocabularyEntry {
  patientTerm: string
  mappedTerm: string
  fieldName: string
  usageCount: number
}

// Extraction Context (erweiterbarer Kontext für Provider)
export interface ExtractionContext {
  corrections?: string
  vocabulary?: string
}

// Provider Interface
export interface ExtractionProvider {
  extract(
    rawInput: string,
    context?: ExtractionContext,
  ): Promise<ExtractionResult>
}

// Transkription Types (Voice → Text via Whisper/GPT-4o-transcribe)
export interface TranscriptionResult {
  text: string
  duration?: number
}

export interface TranscriptionContext {
  vocabularyTerms?: string[]
}

export interface TranscriptionProvider {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    context?: TranscriptionContext,
  ): Promise<TranscriptionResult>
}

// Clarification Types (regelbasierte Nachfrage bei niedriger Konfidenz)
export interface ClarificationQuestion {
  fieldName: string
  question: string
  options: string[]
  allowFreeText: boolean
}

// Zod Schema für API Route Input
export const extractRequestSchema = z.object({
  symptomEventId: z.string().uuid('Ungültige Event-ID'),
  mode: z.enum(['extract', 'transcribe']).optional().default('extract'),
})

export type ExtractRequest = z.infer<typeof extractRequestSchema>
