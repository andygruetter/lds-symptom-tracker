import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => ({
        insert: mockInsert,
        select: vi.fn(() => ({
          eq: mockEq,
        })),
        update: mockUpdate,
      })),
    }),
  ),
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}))

const mockFetch = vi.fn(() =>
  Promise.resolve(new Response(JSON.stringify({ success: true }))),
)
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

  // Default chain: insert → select → single
  mockSingle.mockResolvedValue({
    data: {
      id: 'event-1',
      account_id: 'user-1',
      event_type: 'symptom',
      raw_input: 'Kopfschmerzen',
      status: 'pending',
      created_at: '2026-03-02T10:00:00Z',
      ended_at: null,
      deleted_at: null,
    },
    error: null,
  })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
})

describe('createSymptomEvent', () => {
  it('gibt VALIDATION_ERROR zurück bei leerem Input', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await createSymptomEvent({ raw_input: '' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt VALIDATION_ERROR zurück bei fehlendem raw_input', async () => {
    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await createSymptomEvent({})

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await createSymptomEvent({
      raw_input: 'Kopfschmerzen rechts',
    })

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('speichert Event und gibt Daten zurück bei Erfolg', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await createSymptomEvent({
      raw_input: 'Kopfschmerzen rechts',
    })

    expect(result.data).not.toBeNull()
    expect(result.data?.raw_input).toBe('Kopfschmerzen')
    expect(result.data?.status).toBe('pending')
    expect(result.error).toBeNull()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('gibt DB_ERROR zurück bei Datenbankfehler', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await createSymptomEvent({
      raw_input: 'Kopfschmerzen rechts',
    })

    expect(result.error?.code).toBe('DB_ERROR')
    expect(result.data).toBeNull()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('ruft insert mit raw_input und account_id auf', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    await createSymptomEvent({ raw_input: 'Rückenschmerzen links' })

    expect(mockInsert).toHaveBeenCalledWith({
      raw_input: 'Rückenschmerzen links',
      account_id: 'user-1',
    })
  })

  it('triggert KI-Extraktion nach erfolgreichem Insert', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    await createSymptomEvent({ raw_input: 'Kopfschmerzen rechts' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/ai/extract',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptomEventId: 'event-1' }),
      }),
    )
  })

  it('triggert keine Extraktion bei DB-Fehler', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    const { createSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    await createSymptomEvent({ raw_input: 'Kopfschmerzen rechts' })

    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('confirmSymptomEvent', () => {
  const validEventId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

  function setupConfirmMocks(
    extractedUpdateResult: { error: unknown },
    eventUpdateResult?: { data: unknown; error: unknown },
  ) {
    let updateCallCount = 0
    mockUpdate.mockImplementation(() => {
      updateCallCount++
      if (updateCallCount === 1) {
        // extracted_data update → .eq()
        return { eq: vi.fn().mockResolvedValue(extractedUpdateResult) }
      }
      // symptom_events update → .eq().select().single()
      const updateSingle = vi.fn().mockResolvedValue(eventUpdateResult)
      const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
      return { eq: vi.fn().mockReturnValue({ select: updateSelect }) }
    })
  }

  it('gibt VALIDATION_ERROR zurück bei ungültiger Event-ID', async () => {
    const { confirmSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await confirmSymptomEvent({ eventId: 'not-a-uuid' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { confirmSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await confirmSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('bestätigt alle extracted_data und setzt Event-Status auf confirmed', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    setupConfirmMocks(
      { error: null },
      {
        data: {
          id: validEventId,
          account_id: 'user-1',
          event_type: 'symptom',
          raw_input: 'Kopfschmerzen',
          status: 'confirmed',
          created_at: '2026-03-02T10:00:00Z',
          ended_at: null,
          deleted_at: null,
        },
        error: null,
      },
    )

    const { confirmSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await confirmSymptomEvent({ eventId: validEventId })

    expect(result.data?.status).toBe('confirmed')
    expect(result.error).toBeNull()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('gibt DB_ERROR zurück wenn extracted_data Update fehlschlägt', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })

    setupConfirmMocks({ error: { message: 'Update failed' } })

    const { confirmSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await confirmSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('DB_ERROR')
    expect(result.data).toBeNull()
  })
})

describe('correctExtractedField', () => {
  it('gibt VALIDATION_ERROR zurück bei ungültigem Input', async () => {
    const { correctExtractedField } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await correctExtractedField({})

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt VALIDATION_ERROR zurück bei leerem fieldName', async () => {
    const { correctExtractedField } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await correctExtractedField({
      eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      fieldName: '',
      newValue: 'Oberer Rücken',
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const { correctExtractedField } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await correctExtractedField({
      eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      fieldName: 'Körperteil',
      newValue: 'Oberer Rücken',
    })

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('gibt NOT_FOUND zurück wenn Feld nicht existiert', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })

    // Mock: select().eq().eq().single() returns not found
    mockEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }),
    })

    const { correctExtractedField } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await correctExtractedField({
      eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      fieldName: 'Körperteil',
      newValue: 'Oberer Rücken',
    })

    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.data).toBeNull()
  })

  it('korrigiert Feld erfolgreich und protokolliert Korrektur', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })

    // Mock: select().eq().eq().single() returns existing field
    mockEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'field-1',
            symptom_event_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
            field_name: 'Körperteil',
            value: 'Schulterblatt',
            confidence: 75,
            confirmed: false,
            created_at: '2026-03-02T10:00:00Z',
          },
          error: null,
        }),
      }),
    })

    // Mock: update().eq().eq().select().single() for the field update
    const updatedField = {
      id: 'field-1',
      symptom_event_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      field_name: 'Körperteil',
      value: 'Oberer Rücken',
      confidence: 75,
      confirmed: true,
      created_at: '2026-03-02T10:00:00Z',
    }
    const updateSingle = vi.fn().mockResolvedValue({
      data: updatedField,
      error: null,
    })
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEqInner = vi.fn().mockReturnValue({ select: updateSelect })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: updateEqInner }) })

    // Mock: insert for corrections table
    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn() }) })
    // Override insert specifically for corrections (second from() call)
    // The mock setup uses a single from() mock, so we chain insert to resolve with no error
    mockInsert.mockResolvedValue({ error: null })

    const { correctExtractedField } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await correctExtractedField({
      eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      fieldName: 'Körperteil',
      newValue: 'Oberer Rücken',
    })

    expect(result.data).not.toBeNull()
    expect(result.data?.value).toBe('Oberer Rücken')
    expect(result.data?.confirmed).toBe(true)
    expect(result.error).toBeNull()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('endSymptomEvent', () => {
  const validEventId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

  function setupEndMocks(
    lookupResult: { data: unknown; error: unknown },
    updateResult?: { data: unknown; error: unknown },
  ) {
    // Lookup chain: select('*').eq('id',...).eq('account_id',...).eq('status','confirmed').is('ended_at',null).single()
    const lookupSingle = vi.fn().mockResolvedValue(lookupResult)
    const lookupIs = vi.fn().mockReturnValue({ single: lookupSingle })
    const lookupEqStatus = vi.fn().mockReturnValue({ is: lookupIs })
    const lookupEqAccount = vi.fn().mockReturnValue({ eq: lookupEqStatus })
    mockEq.mockReturnValue({ eq: lookupEqAccount })

    if (updateResult) {
      // Update chain: update({...}).eq('id',...).select().single()
      const updateSingle = vi.fn().mockResolvedValue(updateResult)
      const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
      const updateEq = vi.fn().mockReturnValue({ select: updateSelect })
      mockUpdate.mockReturnValue({ eq: updateEq })
    }
  }

  const confirmedEvent = {
    id: validEventId,
    account_id: 'user-1',
    event_type: 'symptom',
    raw_input: 'Kopfschmerzen',
    status: 'confirmed',
    created_at: '2026-03-02T10:00:00Z',
    ended_at: null,
    deleted_at: null,
  }

  const endedEvent = {
    ...confirmedEvent,
    ended_at: '2026-03-02T13:00:00Z',
  }

  it('gibt VALIDATION_ERROR zurück bei ungültiger Event-ID', async () => {
    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: 'not-a-uuid' })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('gibt NOT_FOUND zurück wenn Event nicht existiert', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    setupEndMocks({ data: null, error: null })

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.data).toBeNull()
  })

  it('gibt NOT_FOUND zurück wenn Event bereits beendet (ended_at IS NULL Filter)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    setupEndMocks({ data: null, error: null })

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('beendet Event erfolgreich und gibt aktualisiertes Event zurück', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    setupEndMocks(
      { data: confirmedEvent, error: null },
      { data: endedEvent, error: null },
    )

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: validEventId })

    expect(result.data).not.toBeNull()
    expect(result.data?.ended_at).toBe('2026-03-02T13:00:00Z')
    expect(result.error).toBeNull()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('gibt UPDATE_FAILED zurück bei Datenbankfehler beim Update', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    setupEndMocks(
      { data: confirmedEvent, error: null },
      { data: null, error: { message: 'Update failed' } },
    )

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await endSymptomEvent({ eventId: validEventId })

    expect(result.error?.code).toBe('UPDATE_FAILED')
    expect(result.data).toBeNull()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('ruft revalidatePath nach erfolgreichem Beenden auf', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
    })
    setupEndMocks(
      { data: confirmedEvent, error: null },
      { data: endedEvent, error: null },
    )

    const { endSymptomEvent } = await import(
      '@/lib/actions/symptom-actions'
    )
    await endSymptomEvent({ eventId: validEventId })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})

describe('answerClarification', () => {
  const validInput = {
    eventId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    fieldName: 'Seite',
    answer: 'Links',
  }

  it('gibt VALIDATION_ERROR zurück bei ungültigem Input', async () => {
    const { answerClarification } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await answerClarification({})

    expect(result.error?.code).toBe('VALIDATION_ERROR')
    expect(result.data).toBeNull()
  })

  it('gibt VALIDATION_ERROR zurück bei leerer Antwort', async () => {
    const { answerClarification } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await answerClarification({
      ...validInput,
      answer: '',
    })

    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn kein User', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })

    const { answerClarification } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await answerClarification(validInput)

    expect(result.error?.code).toBe('AUTH_REQUIRED')
    expect(result.data).toBeNull()
  })

  it('gibt NOT_FOUND zurück wenn Feld nicht existiert', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })

    mockEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      }),
    })

    const { answerClarification } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await answerClarification(validInput)

    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.data).toBeNull()
  })

  it('speichert Antwort erfolgreich und protokolliert Korrektur', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
    })

    // Mock: select().eq().eq().single() returns existing field
    mockEq.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'field-1',
            symptom_event_id: validInput.eventId,
            field_name: 'Seite',
            value: 'rechts',
            confidence: 55,
            confirmed: false,
            created_at: '2026-03-03T10:00:00Z',
          },
          error: null,
        }),
      }),
    })

    // Mock: update().eq().eq().select().single() for the field update
    const updatedField = {
      id: 'field-1',
      symptom_event_id: validInput.eventId,
      field_name: 'Seite',
      value: 'Links',
      confidence: 55,
      confirmed: true,
      created_at: '2026-03-03T10:00:00Z',
    }
    const updateSingle = vi.fn().mockResolvedValue({
      data: updatedField,
      error: null,
    })
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEqInner = vi.fn().mockReturnValue({ select: updateSelect })
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: updateEqInner }),
    })

    // Mock: insert for corrections table
    mockInsert.mockResolvedValue({ error: null })

    const { answerClarification } = await import(
      '@/lib/actions/symptom-actions'
    )
    const result = await answerClarification(validInput)

    expect(result.data).not.toBeNull()
    expect(result.data?.value).toBe('Links')
    expect(result.data?.confirmed).toBe(true)
    expect(result.error).toBeNull()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })
})
