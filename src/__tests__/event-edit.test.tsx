import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CorrectionHistory } from '@/components/event/correction-history'
import { EventEditForm } from '@/components/event/event-edit-form'
import type { Database } from '@/types/database'
import type { SymptomEvent } from '@/types/symptom'

type Correction = Database['public']['Tables']['corrections']['Row']

// Mock next/navigation
const mockPush = vi.fn()
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

// Mock correctExtractedField action
const mockCorrectExtractedField = vi
  .fn()
  .mockResolvedValue({ data: {}, error: null })
vi.mock('@/lib/actions/symptom-actions', () => ({
  correctExtractedField: (...args: unknown[]) =>
    mockCorrectExtractedField(...args),
}))

const mockEvent: SymptomEvent = {
  id: 'event-1',
  account_id: 'user-1',
  event_type: 'symptom',
  raw_input: 'Gestern Morgen hatte ich zwei Stunden Kopfschmerzen',
  status: 'extracted',
  created_at: '2026-03-10T10:00:00Z',
  ended_at: null,
  deleted_at: null,
  audio_url: null,
  occurred_at: '2026-03-09T08:00:00Z',
}

const mockExtractedFields = [
  {
    id: 'f1',
    symptom_event_id: 'event-1',
    field_name: 'symptom_name',
    value: 'Kopfschmerzen',
    confidence: 95,
    confirmed: true,
    created_at: '2026-03-10T10:00:00Z',
    symptom_index: 0,
    medication_index: null,
  },
  {
    id: 'f2',
    symptom_event_id: 'event-1',
    field_name: 'duration',
    value: '120',
    confidence: 88,
    confirmed: false,
    created_at: '2026-03-10T10:00:00Z',
    symptom_index: 0,
    medication_index: null,
  },
  {
    id: 'f3',
    symptom_event_id: 'event-1',
    field_name: 'symptom_time',
    value: '2026-03-09T08:00:00Z',
    confidence: 75,
    confirmed: false,
    created_at: '2026-03-10T10:00:00Z',
    symptom_index: 0,
    medication_index: null,
  },
]

const ALL_FIELD_NAMES = [
  'symptom_name',
  'body_region',
  'side',
  'symptom_type',
  'intensity',
  'symptom_time',
  'duration',
]

describe('EventEditForm', () => {
  it('zeigt alle definierten Felder an', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    expect(screen.getByText('Symptom')).toBeInTheDocument()
    expect(screen.getByText('Körperregion')).toBeInTheDocument()
    expect(screen.getByText('Seite')).toBeInTheDocument()
    expect(screen.getByText('Art')).toBeInTheDocument()
    expect(screen.getByText('Intensität (1–10)')).toBeInTheDocument()
    expect(screen.getByText('Zeitpunkt')).toBeInTheDocument()
    expect(screen.getByText('Dauer')).toBeInTheDocument()
  })

  it('zeigt extrahierte Werte vorbelegt an', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    const symptomNameInput = screen.getByDisplayValue('Kopfschmerzen')
    expect(symptomNameInput).toBeInTheDocument()
  })

  it('zeigt leere Felder mit Placeholder "Nicht erfasst"', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={[]}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    const placeholders = screen.getAllByPlaceholderText('Nicht erfasst')
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('zeigt Original-Meldung als read-only Block an', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    expect(screen.getByText('Ursprüngliche Meldung')).toBeInTheDocument()
    expect(
      screen.getByText('Gestern Morgen hatte ich zwei Stunden Kopfschmerzen'),
    ).toBeInTheDocument()
  })

  it('ruft correctExtractedField auf wenn Wert geändert und Blur ausgelöst', async () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    const input = screen.getByDisplayValue('Kopfschmerzen')
    fireEvent.change(input, { target: { value: 'Migräne' } })
    fireEvent.blur(input)

    await waitFor(() => {
      expect(mockCorrectExtractedField).toHaveBeenCalledWith({
        eventId: 'event-1',
        fieldName: 'symptom_name',
        newValue: 'Migräne',
        symptomIndex: 0,
        medicationIndex: null,
      })
    })
  })

  it('ruft correctExtractedField NICHT auf wenn Wert unverändert (Dirty-Check)', async () => {
    mockCorrectExtractedField.mockClear()

    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    const input = screen.getByDisplayValue('Kopfschmerzen')
    fireEvent.blur(input) // Kein Change → kein Save

    await waitFor(() => {
      expect(mockCorrectExtractedField).not.toHaveBeenCalled()
    })
  })

  it('hat Schliessen-Button', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Schliessen' }),
    ).toBeInTheDocument()
  })

  it('zeigt Einheiten-Toggle für Dauer (Min/Std/Tage)', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    expect(screen.getByRole('button', { name: 'Min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Std' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tage' })).toBeInTheDocument()
  })

  it('konvertiert 120 Minuten zu 2 Stunden bei Einheitenwechsel', () => {
    render(
      <EventEditForm
        event={mockEvent}
        extractedFields={mockExtractedFields}
        corrections={[]}
        allFieldNames={ALL_FIELD_NAMES}
      />,
    )

    // Klick auf Std-Button → Konvertierung
    const stdButton = screen.getByRole('button', { name: 'Std' })
    fireEvent.click(stdButton)

    // Nach Klick auf Std: 120 / 60 = 2 — max ändert sich auf 720
    const allNumberInputs = document.querySelectorAll('input[type="number"]')
    const durationEl = Array.from(allNumberInputs).find(
      (el) => (el as HTMLInputElement).max === '720',
    ) as HTMLInputElement
    expect(durationEl?.value).toBe('2')
  })
})

describe('CorrectionHistory', () => {
  const mockCorrections: Correction[] = [
    {
      id: 'c1',
      account_id: 'user-1',
      symptom_event_id: 'event-1',
      field_name: 'symptom_name',
      original_value: 'Kopfschmerzen',
      corrected_value: 'Migräne',
      created_at: '2026-03-10T11:00:00Z',
    },
    {
      id: 'c2',
      account_id: 'user-1',
      symptom_event_id: 'event-1',
      field_name: 'duration',
      original_value: null,
      corrected_value: '120',
      created_at: '2026-03-10T11:05:00Z',
    },
  ]

  it('wird nicht gerendert wenn keine Corrections vorhanden', () => {
    const { container } = render(<CorrectionHistory corrections={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('zeigt Anzahl der Änderungen im Button', () => {
    render(<CorrectionHistory corrections={mockCorrections} />)
    expect(screen.getByText('2 Änderungen')).toBeInTheDocument()
  })

  it('ist initial zugeklappt', () => {
    render(<CorrectionHistory corrections={mockCorrections} />)
    expect(screen.queryByText('Migräne')).not.toBeInTheDocument()
  })

  it('zeigt Einträge nach Aufklappen', () => {
    render(<CorrectionHistory corrections={mockCorrections} />)

    fireEvent.click(screen.getByText('2 Änderungen'))

    expect(screen.getByText('Migräne')).toBeInTheDocument()
    expect(screen.getByText('Kopfschmerzen')).toBeInTheDocument()
  })

  it('zeigt "Nachträglich erfasst" wenn original_value null ist', () => {
    render(<CorrectionHistory corrections={mockCorrections} />)

    fireEvent.click(screen.getByText('2 Änderungen'))

    expect(screen.getByText('Nachträglich erfasst')).toBeInTheDocument()
  })

  it('zeigt "1 Änderung" in Singular', () => {
    render(<CorrectionHistory corrections={[mockCorrections[0]]} />)
    expect(screen.getByText('1 Änderung')).toBeInTheDocument()
  })
})
