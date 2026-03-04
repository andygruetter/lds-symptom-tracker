import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUpsertVocabularyEntry = vi.fn()
vi.mock('@/lib/db/vocabulary', () => ({
  upsertVocabularyEntry: (...args: unknown[]) =>
    mockUpsertVocabularyEntry(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUpsertVocabularyEntry.mockResolvedValue(undefined)
})

describe('updateVocabularyFromCorrection', () => {
  it('erstellt Vokabular-Eintrag bei neuer Korrektur', async () => {
    const supabase = {} as never

    const { updateVocabularyFromCorrection } = await import(
      '@/lib/ai/vocabulary-builder'
    )
    await updateVocabularyFromCorrection(supabase, 'user-1', {
      fieldName: 'body_region',
      originalValue: 'Rügge',
      correctedValue: 'Rücken',
    })

    expect(mockUpsertVocabularyEntry).toHaveBeenCalledWith(
      supabase,
      'user-1',
      'Rügge',
      'Rücken',
      'body_region',
    )
  })

  it('überspringt Eintrag wenn original === corrected (keine Korrektur)', async () => {
    const supabase = {} as never

    const { updateVocabularyFromCorrection } = await import(
      '@/lib/ai/vocabulary-builder'
    )
    await updateVocabularyFromCorrection(supabase, 'user-1', {
      fieldName: 'body_region',
      originalValue: 'Rücken',
      correctedValue: 'Rücken',
    })

    expect(mockUpsertVocabularyEntry).not.toHaveBeenCalled()
  })

  it('überspringt Eintrag bei leerem originalValue', async () => {
    const supabase = {} as never

    const { updateVocabularyFromCorrection } = await import(
      '@/lib/ai/vocabulary-builder'
    )
    await updateVocabularyFromCorrection(supabase, 'user-1', {
      fieldName: 'body_region',
      originalValue: '',
      correctedValue: 'Rücken',
    })

    expect(mockUpsertVocabularyEntry).not.toHaveBeenCalled()
  })

  it('überspringt Eintrag bei leerem correctedValue', async () => {
    const supabase = {} as never

    const { updateVocabularyFromCorrection } = await import(
      '@/lib/ai/vocabulary-builder'
    )
    await updateVocabularyFromCorrection(supabase, 'user-1', {
      fieldName: 'body_region',
      originalValue: 'Rügge',
      correctedValue: '  ',
    })

    expect(mockUpsertVocabularyEntry).not.toHaveBeenCalled()
  })

  it('leitet Fehler weiter wenn upsert fehlschlägt', async () => {
    const supabase = {} as never
    mockUpsertVocabularyEntry.mockRejectedValue(new Error('DB error'))

    const { updateVocabularyFromCorrection } = await import(
      '@/lib/ai/vocabulary-builder'
    )

    await expect(
      updateVocabularyFromCorrection(supabase, 'user-1', {
        fieldName: 'body_region',
        originalValue: 'Rügge',
        correctedValue: 'Rücken',
      }),
    ).rejects.toThrow('DB error')
  })
})
