'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { runExtractionPipeline } from '@/lib/ai/pipeline'
import { updateVocabularyFromCorrection } from '@/lib/ai/vocabulary-builder'
import { createServerClient, createServiceClient } from '@/lib/db/client'
import { getSignedPhotoUrl, uploadAudio, uploadPhoto } from '@/lib/db/media'
import type { ExtractedData } from '@/types/ai'
import type { EventPhoto } from '@/types/analytics'
import type { ActionResult } from '@/types/common'
import type { SymptomEvent } from '@/types/symptom'
import {
  addPhotosToEventSchema,
  answerClarificationSchema,
  confirmSymptomEventSchema,
  correctExtractedFieldSchema,
  createSymptomEventSchema,
  createVoiceSymptomEventSchema,
  endSymptomEventSchema,
  retryExtractionSchema,
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

  // 4. KI-Extraktion nach Response-Senden ausführen (Vercel-kompatibel)
  const serviceClient = createServiceClient()
  after(async () => {
    try {
      await runExtractionPipeline(serviceClient, (data as SymptomEvent).id)
    } catch (err) {
      console.error('[Extraction Pipeline] Failed:', err)
    }
  })

  return { data: data as SymptomEvent, error: null }
}

export async function createVoiceSymptomEvent(
  formData: FormData,
): Promise<ActionResult<SymptomEvent>> {
  // 1. Extract and validate FormData
  const audio = formData.get('audio') as File | null
  const mimeTypeRaw = formData.get('mimeType')

  if (!audio || audio.size === 0) {
    return {
      data: null,
      error: { error: 'Keine Audio-Datei', code: 'VALIDATION_ERROR' },
    }
  }

  const parsed = createVoiceSymptomEventSchema.safeParse({
    mimeType: mimeTypeRaw,
  })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültiger MIME-Type', code: 'VALIDATION_ERROR' },
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

  // 3. Create symptom_event with event_type: 'voice'
  const { data, error } = await supabase
    .from('symptom_events')
    .insert({
      account_id: user.id,
      event_type: 'voice',
      raw_input: '',
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) {
    return {
      data: null,
      error: { error: 'Event erstellen fehlgeschlagen', code: 'DB_ERROR' },
    }
  }

  const event = data as SymptomEvent

  // 4. Upload audio to Supabase Storage
  try {
    const audioBuffer = Buffer.from(await audio.arrayBuffer())
    const storagePath = await uploadAudio(
      supabase,
      user.id,
      event.id,
      audioBuffer,
      parsed.data.mimeType,
    )

    // 5. Update event with audio_url (storage path, not signed URL)
    await supabase
      .from('symptom_events')
      .update({ audio_url: storagePath })
      .eq('id', event.id)
  } catch (uploadError) {
    console.error('[Voice] Audio upload failed:', uploadError)
    // Event exists but without audio — mark as failed
    await supabase
      .from('symptom_events')
      .update({ status: 'extraction_failed' })
      .eq('id', event.id)

    return {
      data: null,
      error: { error: 'Audio-Upload fehlgeschlagen', code: 'UPLOAD_ERROR' },
    }
  }

  revalidatePath('/')

  // 6. KI-Pipeline nach Response-Senden ausführen (Vercel-kompatibel)
  const serviceClient = createServiceClient()
  after(async () => {
    try {
      await runExtractionPipeline(serviceClient, event.id)
    } catch (err) {
      console.error('[Voice Extraction Pipeline] Failed:', err)
    }
  })

  return { data: event, error: null }
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

  // 2. Ownership-Check: Sicherstellen dass Event dem User gehört
  const { data: ownedEvent } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .single()

  if (!ownedEvent) {
    return {
      data: null,
      error: { error: 'Nicht autorisiert', code: 'UNAUTHORIZED' },
    }
  }

  // 3. Update all extracted_data: confirmed = true
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

  // 4. Update symptom_event: status = 'confirmed'
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
  revalidatePath(`/event/${eventId}`)

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

  const { eventId, fieldName, newValue, symptomIndex } = parsed.data

  // 3. Ownership-Check (F5-Fix): Sicherstellen dass Event dem User gehört
  const { data: ownedEvent } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .single()

  if (!ownedEvent) {
    return {
      data: null,
      error: { error: 'Nicht autorisiert', code: 'UNAUTHORIZED' },
    }
  }

  // 4. Load current extracted_data row (falls vorhanden)
  const { data: currentField } = await supabase
    .from('extracted_data')
    .select()
    .eq('symptom_event_id', eventId)
    .eq('field_name', fieldName)
    .eq('symptom_index', symptomIndex)
    .single()

  let resultField: ExtractedData

  if (!currentField) {
    // Task 6b: INSERT-Pfad für Nacherfassung (neues Feld das bisher nicht existiert)
    const { data: insertedField, error: insertError } = await supabase
      .from('extracted_data')
      .insert({
        symptom_event_id: eventId,
        field_name: fieldName,
        value: newValue,
        confidence: 100,
        confirmed: true,
        symptom_index: symptomIndex,
      })
      .select()
      .single()

    if (insertError || !insertedField) {
      return {
        data: null,
        error: { error: 'Feld erstellen fehlgeschlagen', code: 'DB_ERROR' },
      }
    }

    // Correction mit original_value: null (dank F1-Migration nullable)
    const { error: correctionError } = await supabase
      .from('corrections')
      .insert({
        account_id: user.id,
        symptom_event_id: eventId,
        field_name: fieldName,
        original_value: null,
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

    // Vokabular-Update für Nacherfassung (Fire-and-Forget)
    updateVocabularyFromCorrection(supabase, user.id, {
      fieldName,
      originalValue: '',
      correctedValue: newValue,
    }).catch((err) => {
      console.error('[Vocabulary] Update fehlgeschlagen:', err)
    })

    resultField = insertedField as ExtractedData
  } else {
    // Bestehender UPDATE-Pfad
    const originalValue = (currentField as ExtractedData).value

    const { data: updatedField, error: updateError } = await supabase
      .from('extracted_data')
      .update({ value: newValue, confirmed: true })
      .eq('symptom_event_id', eventId)
      .eq('field_name', fieldName)
      .eq('symptom_index', symptomIndex)
      .select()
      .single()

    if (updateError || !updatedField) {
      return {
        data: null,
        error: { error: 'Korrektur fehlgeschlagen', code: 'DB_ERROR' },
      }
    }

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

    // Vokabular-Update (Fire-and-Forget)
    updateVocabularyFromCorrection(supabase, user.id, {
      fieldName,
      originalValue,
      correctedValue: newValue,
    }).catch((err) => {
      console.error('[Vocabulary] Update fehlgeschlagen:', err)
    })

    resultField = updatedField as ExtractedData
  }

  // Task 6c: occurred_at-Sync bei symptom_time-Änderung
  if (fieldName === 'symptom_time') {
    // F13-Fix: ISO-8601 Validierung vor Sync
    const parsedDate = new Date(newValue)
    if (!isNaN(parsedDate.getTime())) {
      // F6-Fix: Immer über Supabase Client .update() — keine String-Interpolation
      const { error: syncError } = await supabase
        .from('symptom_events')
        .update({ occurred_at: newValue })
        .eq('id', eventId)

      if (syncError) {
        console.warn(
          '[correctExtractedField] occurred_at-Sync fehlgeschlagen:',
          syncError.message,
        )
      }
    } else {
      console.warn(
        `[correctExtractedField] Ungültiger symptom_time Wert: ${newValue} — occurred_at nicht synchronisiert`,
      )
    }
  }

  // Task 6d: revalidatePath für Edit-Screen (F14-Fix)
  revalidatePath('/')
  revalidatePath(`/event/${eventId}`)

  return { data: resultField, error: null }
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
  const { error: correctionError } = await supabase.from('corrections').insert({
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

  // 6b. Vokabular-Update (Fire-and-Forget)
  updateVocabularyFromCorrection(supabase, user.id, {
    fieldName,
    originalValue,
    correctedValue: answer,
  }).catch((err) => {
    console.error('[Vocabulary] Update fehlgeschlagen:', err)
  })

  // 6c. occurred_at-Sync bei symptom_time-Antwort
  if (fieldName === 'symptom_time') {
    const parsedDate = new Date(answer)
    if (!isNaN(parsedDate.getTime())) {
      const { error: syncError } = await supabase
        .from('symptom_events')
        .update({ occurred_at: answer })
        .eq('id', eventId)

      if (syncError) {
        console.warn(
          '[answerClarification] occurred_at-Sync fehlgeschlagen:',
          syncError.message,
        )
      }
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
  revalidatePath(`/event/${eventId}`)

  return { data: updatedField as ExtractedData, error: null }
}

export async function addPhotosToEvent(
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  // 1. Extract and validate FormData
  const eventIdRaw = formData.get('eventId')
  const parsed = addPhotosToEventSchema.safeParse({ eventId: eventIdRaw })
  if (!parsed.success) {
    return {
      data: null,
      error: { error: 'Ungültige Event-ID', code: 'VALIDATION_ERROR' },
    }
  }

  const photos = formData.getAll('photos') as File[]
  if (photos.length === 0 || !photos[0]?.size) {
    return {
      data: null,
      error: { error: 'Keine Fotos', code: 'VALIDATION_ERROR' },
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

  const { eventId } = parsed.data

  // 3. Ownership-Check
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

  // 4. Upload each photo and insert into event_photos
  let uploadedCount = 0
  for (const photo of photos) {
    try {
      const photoBlob = new Blob([await photo.arrayBuffer()], {
        type: photo.type || 'image/jpeg',
      })
      const storagePath = await uploadPhoto(
        supabase,
        user.id,
        eventId,
        photoBlob,
        photo.name,
      )

      await supabase.from('event_photos').insert({
        symptom_event_id: eventId,
        storage_path: storagePath,
      })

      uploadedCount++
    } catch (err) {
      console.error('[Photo] Upload failed for', photo.name, err)
    }
  }

  if (uploadedCount === 0) {
    return {
      data: null,
      error: { error: 'Foto-Upload fehlgeschlagen', code: 'UPLOAD_ERROR' },
    }
  }

  revalidatePath('/')

  return { data: { count: uploadedCount }, error: null }
}

export async function loadMoreEventPhotos(
  eventId: string,
  offset: number,
  limit = 10,
): Promise<ActionResult<EventPhoto[]>> {
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

  // Ownership-Check
  const { data: event } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!event) {
    return {
      data: null,
      error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  const { data: photoRows } = await supabase
    .from('event_photos')
    .select('id, storage_path, created_at')
    .eq('symptom_event_id', eventId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (!photoRows) return { data: [], error: null }

  const photos: EventPhoto[] = []
  const results = await Promise.allSettled(
    photoRows.map((p) => getSignedPhotoUrl(supabase, p.storage_path)),
  )
  for (let i = 0; i < photoRows.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      photos.push({
        id: photoRows[i].id,
        signedUrl: result.value,
        createdAt: photoRows[i].created_at ?? new Date().toISOString(),
      })
    }
  }

  return { data: photos, error: null }
}

export async function deleteEventPhoto(
  photoId: string,
): Promise<ActionResult<null>> {
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

  // Fetch photo and verify ownership
  const { data: photo } = await supabase
    .from('event_photos')
    .select('id, storage_path, symptom_event_id')
    .eq('id', photoId)
    .single()

  if (!photo) {
    return {
      data: null,
      error: { error: 'Foto nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  // Verify the event belongs to this user
  const { data: event } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('id', photo.symptom_event_id)
    .eq('account_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!event) {
    return {
      data: null,
      error: { error: 'Keine Berechtigung', code: 'FORBIDDEN' },
    }
  }

  // Delete from storage
  await supabase.storage.from('photos').remove([photo.storage_path])

  // Delete row
  await supabase.from('event_photos').delete().eq('id', photoId)

  revalidatePath(`/event/${photo.symptom_event_id}`)

  return { data: null, error: null }
}

export async function retryExtraction(
  input: unknown,
): Promise<ActionResult<null>> {
  // 1. Zod validation
  const parsed = retryExtractionSchema.safeParse(input)
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

  // 3. Ownership-Check + Status-Check
  const { data: event } = await supabase
    .from('symptom_events')
    .select('id, status')
    .eq('id', eventId)
    .eq('account_id', user.id)
    .single()

  if (!event) {
    return {
      data: null,
      error: { error: 'Event nicht gefunden', code: 'NOT_FOUND' },
    }
  }

  const retriableStatuses = ['extraction_failed', 'transcription_failed']
  if (!retriableStatuses.includes(event.status)) {
    return {
      data: null,
      error: {
        error: 'Event ist nicht in einem fehlgeschlagenen Zustand',
        code: 'INVALID_STATUS',
      },
    }
  }

  // 4. Pipeline mit Service Client ausführen (RLS bypassed)
  const serviceClient = createServiceClient()
  after(async () => {
    try {
      await runExtractionPipeline(serviceClient, eventId)
    } catch (err) {
      console.error('[Retry Extraction Pipeline] Failed:', err)
    }
  })

  revalidatePath('/')

  return { data: null, error: null }
}
