import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
}

function getExtension(mimeType: string): string {
  // Handle codecs suffix: "audio/webm;codecs=opus" → "audio/webm"
  const baseMime = mimeType.split(';')[0].trim()
  return MIME_TO_EXT[baseMime] ?? '.webm'
}

/**
 * Audio-Datei zu Supabase Storage hochladen.
 * Pfad: {accountId}/{eventId}.{ext}
 */
export async function uploadAudio(
  supabase: SupabaseClient<Database>,
  accountId: string,
  eventId: string,
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const ext = getExtension(mimeType)
  const storagePath = `${accountId}/${eventId}${ext}`

  const { error } = await supabase.storage
    .from('audio')
    .upload(storagePath, blob, {
      contentType: mimeType.split(';')[0].trim(),
      upsert: false,
    })

  if (error) {
    throw new Error(`Audio upload fehlgeschlagen: ${error.message}`)
  }

  return storagePath
}

/**
 * Signed URL für Audio-Datei generieren (15min TTL).
 * NICHT cachen — immer frisch generieren.
 */
export async function getSignedAudioUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresIn = 900,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('audio')
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL Generierung fehlgeschlagen: ${error?.message}`)
  }

  return data.signedUrl
}
