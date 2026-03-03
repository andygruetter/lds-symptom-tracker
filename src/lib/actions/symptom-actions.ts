'use server'

import { revalidatePath } from 'next/cache'

import { runExtractionPipeline } from '@/lib/ai/pipeline'
import { createServerClient, createServiceClient } from '@/lib/db/client'
import type { ExtractedData } from '@/types/ai'
import type { ActionResult } from '@/types/common'
import type { SymptomEvent } from '@/types/symptom'
import {
  answerClarificationSchema,
  confirmSymptomEventSchema,
  correctExtractedFieldSchema,
  createSymptomEventSchema,
  endSymptomEventSchema,
} from '@/types/symptom'

export async function createSymptomEvent(
  input: unknown,
): Promise<ActionResult<SymptomEvent>> {
  // 1. Zod validation
  const parsed = createSymptomEventSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Eingabe', code: 'VALIDATION_ERROR' },
    }
  }

  // 2. Auth-Check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  // 3. DB Insert
  const { data, error } = await supabase
    .from('symptom_events')
    .insert({
      raw_input: parsed.data.raw_input,
      account_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: { error: 'Speichern fehlgeschlagen', code: 'DB_ERROR' },
    }
  }
  revalidatePath('/')

  // 4. Fire-and-forget: KI-Extraktion direkt triggern (ohne HTTP-Roundtrip)
  const serviceClient = createServiceClient()
  runExtractionPipeline(serviceClient, (data as SymptomEvent).id).catch(
    (err) => {
      console.error('[Extraction Pipeline] Failed:', err)
    },
  )

  return { data: data as SymptomEvent, error: null }
}

export async function confirmSymptomEvent(
  input: unknown,
): Promise<ActionResult<SymptomEvent>> {
  // 1. Zod validation
  const parsed = confirmSymptomEventSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Event-ID', code: 'VALIDATION_ERROR' },
    }
  }

  const { eventId } = parsed.data

  // 2. Auth-Check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  // 2. Update all extracted_data: confirmed = true
  const { error: extractedError } = await supabase
    .from('extracted_data')
    .update({ confirmed: true })
    .eq('symptom_event_id', eventId)

  if (extractedError) {
    return {
      data: null,
      error: { error: 'Bestätigung fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  // 3. Update symptom_event: status = 'confirmed'
  const { data, error } = await supabase
    .from('symptom_events')
    .update({ status: 'confirmed' })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: { error: 'Status-Update fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  revalidatePath('/')

  return { data: data as SymptomEvent, error: null }
}

export async function endSymptomEvent(
  input: unknown,
): Promise<ActionResult<SymptomEvent>> {
  // 1. Zod validation
  const parsed = endSymptomEventSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Event-ID', code: 'VALIDATION_ERROR' },
    }
  }

  const { eventId } = parsed.data

  // 2. Auth-Check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  // 3. Validate: confirmed + ended_at IS NULL + eigenes Event
  const { data: event } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .eq('status', 'confirmed')
    .is('ended_at', null)
    .single()

  if (!event) {
    return {
      data: null,
      error: {
        error: 'Event nicht gefunden oder bereits beendet',
        code: 'NOT_FOUND',
      },
    }
  }

  // 4. Update ended_at
  const { data, error } = await supabase
    .from('symptom_events')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    return {
      data: null,
      error: { error: 'Beenden fehlgeschlagen', code: 'UPDATE_FAILED' },
    }
  }

  revalidatePath('/')

  return { data: data as SymptomEvent, error: null }
}

export async function correctExtractedField(
  input: unknown,
): Promise<ActionResult<ExtractedData>> {
  // 1. Zod validation
  const parsed = correctExtractedFieldSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Eingabe', code: 'VALIDATION_ERROR' },
    }
  }

  // 2. Auth-Check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const { eventId, fieldName, newValue } = parsed.data

  // 3. Load current extracted_data row
  const { data: currentField, error: fetchError } = await supabase
    .from('extracted_data')
    .select()
    .eq('symptom_event_id', eventId)
    .eq('field_name', fieldName)
    .single()

  if (fetchError || !currentField) {
    return {
      data: null,
      error: { error: 'Feld nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  const originalValue = (currentField as ExtractedData).value

  // 4. Update extracted_data: value = newValue, confirmed = true
  const { data: updatedField, error: updateError } = await supabase
    .from('extracted_data')
    .update({ value: newValue, confirmed: true })
    .eq('symptom_event_id', eventId)
    .eq('field_name', fieldName)
    .select()
    .single()

  if (updateError) {
    return {
      data: null,
      error: { error: 'Korrektur fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  // 5. Insert corrections: original_value, corrected_value
  const { error: correctionError } = await supabase
    .from('corrections')
    .insert({
      account_id: user.id,
      symptom_event_id: eventId,
      field_name: fieldName,
      original_value: originalValue,
      corrected_value: newValue,
    })

  if (correctionError) {
    return {
      data: null,
      error: {
        error: 'Korrektur-Protokollierung fehlgeschlagen',
        code: 'DB_ERROR',
      },
    }
  }

  revalidatePath('/')

  return { data: updatedField as ExtractedData, error: null }
}

export async function answerClarification(
  input: unknown,
): Promise<ActionResult<ExtractedData>> {
  // 1. Zod validation
  const parsed = answerClarificationSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Eingabe', code: 'VALIDATION_ERROR' },
    }
  }

  // 2. Auth-Check
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      data: null,
      error: { error: 'Nicht authentifiziert', code: 'AUTH_REQUIRED' },
    }
  }

  const { eventId, fieldName, answer } = parsed.data

  // 3. Ownership check: Verify user owns this event
  const { data: event } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .single()

  if (!event) {
    return {
      data: null,
      error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  // 4. Load current extracted_data row
  const { data: currentField, error: fetchError } = await supabase
    .from('extracted_data')
    .select()
    .eq('symptom_event_id', eventId)
    .eq('field_name', fieldName)
    .single()

  if (fetchError || !currentField) {
    return {
      data: null,
      error: { error: 'Feld nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  const originalValue = (currentField as ExtractedData).value

  // 5. Update extracted_data: value = answer, confirmed = true
  const { data: updatedField, error: updateError } = await supabase
    .from('extracted_data')
    .update({ value: answer, confirmed: true })
    .eq('symptom_event_id', eventId)
    .eq('field_name', fieldName)
    .select()
    .single()

  if (updateError) {
    return {
      data: null,
      error: { error: 'Antwort-Speicherung fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  // 6. Insert corrections (original_value → answer)
  const { error: correctionError } = await supabase
    .from('corrections')
    .insert({
      account_id: user.id,
      symptom_event_id: eventId,
      field_name: fieldName,
      original_value: originalValue,
      corrected_value: answer,
    })

  if (correctionError) {
    return {
      data: null,
      error: {
        error: 'Korrektur-Protokollierung fehlgeschlagen',
        code: 'DB_ERROR',
      },
    }
  }

  // 7. Check if all uncertain fields are now confirmed → auto-confirm event
  const { data: remainingFields } = await supabase
    .from('extracted_data')
    .select()
    .eq('symptom_event_id', eventId)
    .eq('confirmed', false)

  if (remainingFields && remainingFields.length === 0) {
    await supabase
      .from('symptom_events')
      .update({ status: 'confirmed' })
      .eq('id', eventId)
  }

  revalidatePath('/')

  return { data: updatedField as ExtractedData, error: null }
}
