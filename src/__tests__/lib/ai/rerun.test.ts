import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockDelete = vi.fn()
const mockUpdate = vi.fn()

function createMockSupabase(eventOverrides?: Record<string, unknown>) {
  const defaultEvent = {
    id: 'event-1',
    status: 'confirmed',
    event_type: 'symptom',
    audio_url: null,
  }
  const event = { ...defaultEvent, ...eventOverrides }

  mockEq.mockReturnThis()
  mockSingle.mockResolvedValue({ data: event, error: null })

  return {
    from: vi.fn((table: string) => {
      if (table === 'symptom_events') {
        return {
          select: () => ({ eq: () => ({ single: mockSingle }) }),
          update: (data: unknown) => {
            mockUpdate(data)
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          },
        }
      }
      if (table === 'extracted_data') {
        return {
          delete: () => {
            mockDelete()
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          },
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('prepareRerun', () => {
  it('löscht extracted_data und setzt Status auf transcribed für mode=extract', async () => {
    const supabase = createMockSupabase({ status: 'confirmed' })

    const { prepareRerun } = await import('@/lib/ai/rerun')
    await prepareRerun(supabase as never, 'event-1', 'extract')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'transcribed' })
  })

  it('löscht extracted_data, leert raw_input und setzt Status auf pending für mode=transcribe', async () => {
    const supabase = createMockSupabase({
      status: 'confirmed',
      event_type: 'voice',
      audio_url: 'user-1/voice-1.webm',
    })

    const { prepareRerun } = await import('@/lib/ai/rerun')
    await prepareRerun(supabase as never, 'event-1', 'transcribe')

    expect(mockDelete).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'pending',
      raw_input: '',
    })
  })

  it('wirft Fehler für mode=transcribe bei Text-Events', async () => {
    const supabase = createMockSupabase({
      status: 'confirmed',
      event_type: 'symptom',
      audio_url: null,
    })

    const { prepareRerun } = await import('@/lib/ai/rerun')

    await expect(
      prepareRerun(supabase as never, 'event-1', 'transcribe'),
    ).rejects.toThrow('nur für Voice-Events')
  })

  it('wirft Fehler für mode=transcribe bei Voice-Events ohne audio_url', async () => {
    const supabase = createMockSupabase({
      status: 'confirmed',
      event_type: 'voice',
      audio_url: null,
    })

    const { prepareRerun } = await import('@/lib/ai/rerun')

    await expect(
      prepareRerun(supabase as never, 'event-1', 'transcribe'),
    ).rejects.toThrow('audio_url')
  })

  it('wirft Fehler wenn Event bereits pending ist', async () => {
    const supabase = createMockSupabase({ status: 'pending' })

    const { prepareRerun } = await import('@/lib/ai/rerun')

    await expect(
      prepareRerun(supabase as never, 'event-1', 'extract'),
    ).rejects.toThrow('bereits in Verarbeitung')
  })

  it('wirft Fehler wenn Event nicht gefunden', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })
    const supabase = createMockSupabase()
    // Override single to return null
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      (table: string) => {
        if (table === 'symptom_events') {
          return {
            select: () => ({
              eq: () => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' },
                }),
              }),
            }),
          }
        }
        return {}
      },
    )

    const { prepareRerun } = await import('@/lib/ai/rerun')

    await expect(
      prepareRerun(supabase as never, 'nonexistent', 'extract'),
    ).rejects.toThrow('Event nicht gefunden')
  })
})
