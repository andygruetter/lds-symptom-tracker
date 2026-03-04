import { z } from 'zod/v4'

import type { Database } from '@/types/database'

// DB Row Types
// Status: pending | transcribed | extracted | extraction_failed | transcription_failed | confirmed
export type SymptomEvent =
  Database['public']['Tables']['symptom_events']['Row']

export type EventPhoto =
  Database['public']['Tables']['event_photos']['Row']

// Zod Schema für Server Action Input
export const createSymptomEventSchema = z.object({
  raw_input: z
    .string()
    .min(1, 'Eingabe darf nicht leer sein')
    .max(2000, 'Eingabe zu lang'),
})

export type CreateSymptomEventInput = z.infer<typeof createSymptomEventSchema>

// Zod Schema für confirmSymptomEvent Action
export const confirmSymptomEventSchema = z.object({
  eventId: z.string().uuid('Ungültige Event-ID'),
})

// Zod Schema für endSymptomEvent Action
export const endSymptomEventSchema = z.object({
  eventId: z.string().uuid('Ungültige Event-ID'),
})

// Zod Schema für correctExtractedField Action
export const correctExtractedFieldSchema = z.object({
  eventId: z.string().uuid('Ungültige Event-ID'),
  fieldName: z.string().min(1, 'Feldname darf nicht leer sein'),
  newValue: z.string().min(1, 'Neuer Wert darf nicht leer sein'),
})

export type CorrectExtractedFieldInput = z.infer<
  typeof correctExtractedFieldSchema
>

// Zod Schema für answerClarification Action
export const answerClarificationSchema = z.object({
  eventId: z.string().uuid('Ungültige Event-ID'),
  fieldName: z.string().min(1, 'Feldname darf nicht leer sein'),
  answer: z.string().min(1, 'Antwort darf nicht leer sein'),
})

// Zod Schema für createVoiceSymptomEvent Action (FormData-basiert)
export const createVoiceSymptomEventSchema = z.object({
  mimeType: z
    .string()
    .min(1, 'MIME-Type darf nicht leer sein')
    .refine((val) => val.startsWith('audio/'), 'Nur Audio-MIME-Types erlaubt'),
})

// Zod Schema für addPhotosToEvent Action (FormData-basiert)
export const addPhotosToEventSchema = z.object({
  eventId: z.string().uuid('Ungültige Event-ID'),
})
