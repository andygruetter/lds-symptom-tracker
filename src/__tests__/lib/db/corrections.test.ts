import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Correction } from '@/types/ai'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()

function createMockSupabase() {
  mockLimit.mockResolvedValue({ data: [], error: null })
  mockOrder.mockReturnValue({ limit: mockLimit })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })

  return {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRecentCorrections', () => {
  it('gibt leere Liste zurück wenn keine Korrekturen vorhanden', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    const result = await getRecentCorrections(supabase as never, 'user-1')

    expect(result).toEqual([])
    expect(supabase.from).toHaveBeenCalledWith('corrections')
    expect(mockSelect).toHaveBeenCalledWith(
      'field_name, original_value, corrected_value, created_at',
    )
    expect(mockEq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockLimit).toHaveBeenCalledWith(50)
  })

  it('gibt Korrekturen als Correction-Array zurück', async () => {
    const supabase = createMockSupabase()
    const dbRows = [
      {
        field_name: 'body_region',
        original_value: 'Rügge',
        corrected_value: 'Rücken',
        created_at: '2026-03-01T10:00:00Z',
      },
      {
        field_name: 'symptom_name',
        original_value: 'Chopfweh',
        corrected_value: 'Kopfschmerzen',
        created_at: '2026-02-28T10:00:00Z',
      },
    ]
    mockLimit.mockResolvedValue({ data: dbRows, error: null })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    const result = await getRecentCorrections(supabase as never, 'user-1')

    expect(result).toEqual<Correction[]>([
      {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      },
      {
        fieldName: 'symptom_name',
        originalValue: 'Chopfweh',
        correctedValue: 'Kopfschmerzen',
      },
    ])
  })

  it('respektiert benutzerdefiniertes Limit', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    await getRecentCorrections(supabase as never, 'user-1', 10)

    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  it('nutzt Standard-Limit von 50', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    await getRecentCorrections(supabase as never, 'user-1')

    expect(mockLimit).toHaveBeenCalledWith(50)
  })

  it('sortiert nach created_at absteigend (neueste zuerst)', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({ data: [], error: null })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    await getRecentCorrections(supabase as never, 'user-1')

    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('gibt leere Liste zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabase()
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    })

    const { getRecentCorrections } = await import('@/lib/db/corrections')
    const result = await getRecentCorrections(supabase as never, 'user-1')

    expect(result).toEqual([])
  })
})
