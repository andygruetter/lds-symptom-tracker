import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CapturePage from '@/app/(app)/page'

vi.mock('@/hooks/use-symptom-events', () => ({
  useSymptomEvents: () => ({
    events: [],
    extractedDataMap: {},
    photosMap: {},
    isLoading: false,
    addOptimisticEvent: vi.fn(() => 'optimistic-1'),
    removeOptimisticEvent: vi.fn(),
    refreshExtractedData: vi.fn(),
    refreshPhotos: vi.fn(),
  }),
}))

vi.mock('@/lib/db/client', () => ({
  createBrowserClient: vi.fn(() => ({
    storage: { from: vi.fn() },
  })),
}))

vi.mock('@/lib/db/media', () => ({
  getSignedPhotoUrl: vi.fn(),
}))

vi.mock('@/lib/actions/symptom-actions', () => ({
  createSymptomEvent: vi.fn(),
  createVoiceSymptomEvent: vi.fn(),
  addPhotosToEvent: vi.fn(),
  confirmSymptomEvent: vi.fn(),
  correctExtractedField: vi.fn(),
  endSymptomEvent: vi.fn(),
  answerClarification: vi.fn(),
}))

describe('Capture Page', () => {
  it('zeigt leeren Zustand mit Hinweis-Text', () => {
    render(<CapturePage />)

    expect(
      screen.getByText(/Beschreibe dein Symptom/),
    ).toBeInTheDocument()
  })

  it('zeigt Input-Bar mit Placeholder', () => {
    render(<CapturePage />)

    expect(screen.getByPlaceholderText('Symptom...')).toBeInTheDocument()
  })
})
