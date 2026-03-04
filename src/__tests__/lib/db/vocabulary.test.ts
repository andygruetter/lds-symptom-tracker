import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VocabularyEntry } from '@/types/ai'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRpc = vi.fn()

function createMockSupabase() {
  mockLimit.mockResolvedValue({ data: [], error: null })
  mockOrder.mockReturnValue({ limit: mockLimit })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })

  return {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
    rpc: mockRpc,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRpc.mockResolvedValue({ error: null })
})

describe('getVocabulary', () => {
  it('gibt leere Liste zurück wenn kein Vokabular vorhanden', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getVocabulary } = await import('@/lib/db/vocabulary')
    const result = await getVocabulary(supabase as never, 'user-1')

    expect(result).toEqual([])
    expect(supabase.from).toHaveBeenCalledWith('patient_vocabulary')
    expect(mockSelect).toHaveBeenCalledWith(
      'patient_term, mapped_term, field_name, usage_count',
    )
    expect(mockEq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(mockOrder).toHaveBeenCalledWith('usage_count', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(200)
  })

  it('gibt Vokabular als VocabularyEntry-Array zurück', async () => {
    const supabase = createMockSupabase()
    const dbRows = [
      {
        patient_term: 'rügge',
        mapped_term: 'Rücken',
        field_name: 'body_region',
        usage_count: 5,
      },
      {
        patient_term: 'stächä',
        mapped_term: 'stechend',
        field_name: 'symptom_type',
        usage_count: 3,
      },
    ]
    mockLimit.mockResolvedValue({ data: dbRows, error: null })

    const { getVocabulary } = await import('@/lib/db/vocabulary')
    const result = await getVocabulary(supabase as never, 'user-1')

    expect(result).toEqual<VocabularyEntry[]>([
      {
        patientTerm: 'rügge',
        mappedTerm: 'Rücken',
        fieldName: 'body_region',
        usageCount: 5,
      },
      {
        patientTerm: 'stächä',
        mappedTerm: 'stechend',
        fieldName: 'symptom_type',
        usageCount: 3,
      },
    ])
  })

  it('gibt leere Liste zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    const { getVocabulary } = await import('@/lib/db/vocabulary')
    const result = await getVocabulary(supabase as never, 'user-1')

    expect(result).toEqual([])
  })
})

describe('upsertVocabularyEntry', () => {
  it('ruft RPC-Funktion mit korrekten Parametern auf', async () => {
    const supabase = createMockSupabase()
    mockRpc.mockResolvedValue({ error: null })

    const { upsertVocabularyEntry } = await import('@/lib/db/vocabulary')
    await upsertVocabularyEntry(
      supabase as never,
      'user-1',
      'Rügge',
      'Rücken',
      'body_region',
    )

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_vocabulary_entry', {
      p_account_id: 'user-1',
      p_patient_term: 'Rügge',
      p_mapped_term: 'Rücken',
      p_field_name: 'body_region',
    })
  })

  it('bewahrt originale Schreibweise des patient_term', async () => {
    const supabase = createMockSupabase()
    mockRpc.mockResolvedValue({ error: null })

    const { upsertVocabularyEntry } = await import('@/lib/db/vocabulary')
    await upsertVocabularyEntry(
      supabase as never,
      'user-1',
      'Chopfweh',
      'Kopfschmerzen',
      'symptom_name',
    )

    expect(supabase.rpc).toHaveBeenCalledWith('upsert_vocabulary_entry', {
      p_account_id: 'user-1',
      p_patient_term: 'Chopfweh',
      p_mapped_term: 'Kopfschmerzen',
      p_field_name: 'symptom_name',
    })
  })

  it('wirft Fehler bei DB-Fehler', async () => {
    const supabase = createMockSupabase()
    mockRpc.mockResolvedValue({
      error: { message: 'RPC failed' },
    })

    const { upsertVocabularyEntry } = await import('@/lib/db/vocabulary')

    await expect(
      upsertVocabularyEntry(
        supabase as never,
        'user-1',
        'Rügge',
        'Rücken',
        'body_region',
      ),
    ).rejects.toEqual({ message: 'RPC failed' })
  })
})
