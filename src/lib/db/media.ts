import type { SupabaseClient } from '@supabase/supabase-js'

import { audioStorageExtension } from '@/lib/utils/mime'
import type { Database } from '@/types/database'

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
}

export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(IMAGE_MIME_TO_EXT)

function getImageExtension(mimeType: string): string {
  const baseMime = mimeType.split(';')[0].trim()
  return IMAGE_MIME_TO_EXT[baseMime] ?? '.jpg'
}

/**
 * Audio-Datei zu Supabase Storage hochladen.
 * Pfad: {accountId}/{eventId}.{ext}
 */
export async function uploadAudio(
  supabase: SupabaseClient<Database>,
  accountId: string,
  eventId: string,
  audioData: Buffer | Uint8Array,
  mimeType: string,
): Promise<string> {
  const ext = audioStorageExtension(mimeType)
  const storagePath = `${accountId}/${eventId}${ext}`

  const { error } = await supabase.storage
    .from('audio')
    .upload(storagePath, audioData, {
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

/**
 * Foto zu Supabase Storage hochladen.
 * Pfad: {accountId}/{eventId}/{timestamp}-{fileName}
 */
export async function uploadPhoto(
  supabase: SupabaseClient<Database>,
  accountId: string,
  eventId: string,
  blob: Blob,
  fileName: string,
): Promise<string> {
  const mimeType = blob.type || 'image/jpeg'

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Ungültiger Bild-MIME-Type: ${mimeType}`)
  }

  const ext = getImageExtension(mimeType)
  const timestamp = Date.now()
  // Strip existing extension to avoid double extension (e.g., photo.png.jpg)
  const baseName = fileName.replace(/\.[^.]+$/, '') || fileName
  const storagePath = `${accountId}/${eventId}/${timestamp}-${baseName}${ext}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(storagePath, blob, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Foto-Upload fehlgeschlagen: ${error.message}`)
  }

  return storagePath
}

/**
 * Signed URL für Foto generieren (15min TTL).
 */
export async function getSignedPhotoUrl(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  expiresIn = 900,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(
      `Foto Signed URL Generierung fehlgeschlagen: ${error?.message}`,
    )
  }

  return data.signedUrl
}
