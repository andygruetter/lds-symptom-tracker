import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  medicationExtraction,
  symptomExtraction,
} from '@/lib/ai/__fixtures__/extractions'

// Mock the Claude provider
const mockExtract = vi.fn()
vi.mock('@/lib/ai/providers/claude', () => ({
  claudeProvider: {
    extract: (...args: unknown[]) => mockExtract(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('extractSymptomData', () => {
  it('extrahiert Symptom-Daten via Provider', async () => {
    mockExtract.mockResolvedValue(symptomExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Kopfschmerzen rechts stechend')

    expect(result.eventType).toBe('symptom')
    expect(result.fields).toHaveLength(4)
    expect(result.fields[0].fieldName).toBe('symptom_name')
    expect(result.fields[0].value).toBe('Kopfschmerzen')
    expect(mockExtract).toHaveBeenCalledWith('Kopfschmerzen rechts stechend')
  })

  it('extrahiert Medikamenten-Daten via Provider', async () => {
    mockExtract.mockResolvedValue(medicationExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Habe Ibuprofen 400mg genommen')

    expect(result.eventType).toBe('medication')
    expect(result.fields).toHaveLength(3)
    expect(result.fields[0].fieldName).toBe('medication_name')
  })

  it('propagiert Provider-Fehler', async () => {
    mockExtract.mockRejectedValue(new Error('API unavailable'))

    const { extractSymptomData } = await import('@/lib/ai/extract')

    await expect(
      extractSymptomData('Test'),
    ).rejects.toThrow('API unavailable')
  })
})
