import { randomBytes } from 'crypto'

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123'

// Service role key (HS256) works for REST/DB API (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// Auth client (anon key) for sign-in operations
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

interface SymptomEventInsert {
  raw_input?: string
  status?: string
  event_type?: string
  ended_at?: string | null
  created_at?: string
  occurred_at?: string
  audio_url?: string | null
}

interface ExtractedField {
  field_name: string
  value: string
  confidence: number
  confirmed?: boolean
}

export async function getTestUserId(): Promise<string> {
  // Sign in to get user ID without needing admin API
  const { data, error } = await authClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (error || !data.user)
    throw new Error(`Test-User ${TEST_EMAIL} nicht gefunden: ${error?.message}`)
  return data.user.id
}

export async function createTestSymptomEvent(
  accountId: string,
  overrides?: SymptomEventInsert,
) {
  const { data, error } = await supabase
    .from('symptom_events')
    .insert({
      account_id: accountId,
      raw_input: overrides?.raw_input ?? 'Testsymptom Kopfschmerzen',
      status: overrides?.status ?? 'pending',
      event_type: overrides?.event_type ?? 'symptom',
      ended_at: overrides?.ended_at ?? null,
      ...(overrides?.created_at ? { created_at: overrides.created_at } : {}),
      ...(overrides?.occurred_at ? { occurred_at: overrides.occurred_at } : {}),
      ...(overrides?.audio_url !== undefined
        ? { audio_url: overrides.audio_url }
        : {}),
    })
    .select()
    .single()

  if (error) throw new Error(`Event erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function createTestExtractedData(
  symptomEventId: string,
  fields: ExtractedField[],
) {
  const rows = fields.map((f) => ({
    symptom_event_id: symptomEventId,
    field_name: f.field_name,
    value: f.value,
    confidence: f.confidence,
    confirmed: f.confirmed ?? false,
  }))

  const { data, error } = await supabase
    .from('extracted_data')
    .insert(rows)
    .select()

  if (error)
    throw new Error(`Extracted Data erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function getSymptomEvent(eventId: string) {
  const { data, error } = await supabase
    .from('symptom_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) throw new Error(`Event laden fehlgeschlagen: ${error.message}`)
  return data
}

export async function uploadTestAudioFile(storagePath: string) {
  // Minimal valid WebM file (empty audio)
  const webmHeader = new Uint8Array([
    0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f,
    0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04,
    0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
  ])
  const { error } = await supabase.storage
    .from('audio')
    .upload(storagePath, webmHeader, {
      contentType: 'audio/webm',
      upsert: true,
    })
  if (error) throw new Error(`Audio-Upload fehlgeschlagen: ${error.message}`)
}

export async function uploadTestPhotoFile(storagePath: string) {
  // Minimal 1x1 JPEG
  const jpegBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0x7b, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0xff,
    0xd9,
  ])
  const { error } = await supabase.storage
    .from('photos')
    .upload(storagePath, jpegBytes, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) throw new Error(`Foto-Upload fehlgeschlagen: ${error.message}`)
}

export async function createTestEventPhoto(
  symptomEventId: string,
  storagePath?: string,
) {
  const path = storagePath ?? `test/${symptomEventId}/test-photo.jpg`

  // Upload actual file so signed URL generation succeeds
  await uploadTestPhotoFile(path)

  const { data, error } = await supabase
    .from('event_photos')
    .insert({
      symptom_event_id: symptomEventId,
      storage_path: path,
    })
    .select()
    .single()

  if (error)
    throw new Error(`Event-Foto erstellen fehlgeschlagen: ${error.message}`)
  return data
}

interface CreateMultipleEventsOptions {
  /** Base raw_input text (suffixed with index) */
  rawInputPrefix?: string
  /** Event status for all events */
  status?: string
  /** Event type for all events */
  eventType?: string
  /** Start date for occurred_at spread (defaults to 30 days ago) */
  startDate?: Date
  /** End date for occurred_at spread (defaults to now) */
  endDate?: Date
}

export async function createMultipleTestEvents(
  accountId: string,
  count: number,
  options?: CreateMultipleEventsOptions,
) {
  const {
    rawInputPrefix = 'Testsymptom',
    status = 'confirmed',
    eventType = 'symptom',
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
  } = options ?? {}

  const timeSpan = endDate.getTime() - startDate.getTime()
  const events = []

  for (let i = 0; i < count; i++) {
    const occurredAt = new Date(
      startDate.getTime() + (timeSpan / Math.max(count - 1, 1)) * i,
    ).toISOString()

    const event = await createTestSymptomEvent(accountId, {
      raw_input: `${rawInputPrefix} ${i + 1}`,
      status,
      event_type: eventType,
      occurred_at: occurredAt,
    })
    events.push(event)
  }

  return events
}

interface SharingLinkInsert {
  token?: string
  date_from?: string
  date_to?: string
  expires_at?: string
  revoked_at?: string | null
  recipient_email?: string | null
}

export function generateTestToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createTestSharingLink(
  accountId: string,
  overrides?: SharingLinkInsert,
) {
  const token = overrides?.token ?? generateTestToken()
  const { data, error } = await supabase
    .from('sharing_links')
    .insert({
      account_id: accountId,
      token,
      date_from: overrides?.date_from ?? '2026-01-01',
      date_to: overrides?.date_to ?? '2026-03-15',
      expires_at:
        overrides?.expires_at ??
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: overrides?.revoked_at ?? null,
      recipient_email: overrides?.recipient_email ?? null,
    })
    .select()
    .single()

  if (error)
    throw new Error(`Sharing-Link erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function getSharingLink(linkId: string) {
  const { data, error } = await supabase
    .from('sharing_links')
    .select('*')
    .eq('id', linkId)
    .single()

  if (error)
    throw new Error(`Sharing-Link laden fehlgeschlagen: ${error.message}`)
  return data
}

export async function cleanupTestSharingLinks(accountId: string) {
  await supabase.from('sharing_links').delete().eq('account_id', accountId)
}

export async function createTestAuditEntry(
  accountId: string,
  sharingLinkId: string,
  overrides?: {
    action?: string
    accessed_at?: string
    ip_address_hash?: string | null
  },
) {
  const { data, error } = await supabase
    .from('audit_log')
    .insert({
      account_id: accountId,
      sharing_link_id: sharingLinkId,
      action: overrides?.action ?? 'dashboard_view',
      accessed_at: overrides?.accessed_at ?? new Date().toISOString(),
      ip_address_hash: overrides?.ip_address_hash ?? null,
    })
    .select()
    .single()

  if (error)
    throw new Error(`Audit-Eintrag erstellen fehlgeschlagen: ${error.message}`)
  return data
}

export async function getAuditEntriesForLink(sharingLinkId: string) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('sharing_link_id', sharingLinkId)
    .order('accessed_at', { ascending: false })

  if (error)
    throw new Error(`Audit-Einträge laden fehlgeschlagen: ${error.message}`)
  return data ?? []
}

export async function cleanupTestAuditEntries(accountId: string) {
  await supabase.from('audit_log').delete().eq('account_id', accountId)
}

export async function cleanupTestData(accountId: string) {
  const { data: events } = await supabase
    .from('symptom_events')
    .select('id')
    .eq('account_id', accountId)

  if (events && events.length > 0) {
    const ids = events.map((e) => e.id)
    await supabase.from('event_photos').delete().in('symptom_event_id', ids)
    await supabase.from('corrections').delete().in('symptom_event_id', ids)
    await supabase.from('extracted_data').delete().in('symptom_event_id', ids)
  }
  await supabase.from('symptom_events').delete().eq('account_id', accountId)
}
