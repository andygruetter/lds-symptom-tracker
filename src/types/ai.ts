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
}

export interface ExtractionResult {
  eventType: 'symptom' | 'medication'
  fields: ExtractionField[]
}

// Zod Schema für Claude Tool-Output Validation
export const extractionFieldSchema = z.object({
  fieldName: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(100),
})

export const extractionResultSchema = z.object({
  eventType: z.enum(['symptom', 'medication']),
  fields: z.array(extractionFieldSchema).min(1),
})

// Provider Interface
export interface ExtractionProvider {
  extract(rawInput: string): Promise<ExtractionResult>
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
})

export type ExtractRequest = z.infer<typeof extractRequestSchema>
