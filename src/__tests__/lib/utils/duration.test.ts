import { describe, expect, it, vi } from 'vitest'

import { formatActiveSince, formatDuration } from '@/lib/utils/duration'

describe('formatDuration', () => {
  it('gibt Minuten zurück für kurze Dauern', () => {
    const start = new Date('2026-03-02T10:00:00Z')
    const end = new Date('2026-03-02T10:15:00Z')
    expect(formatDuration(start, end)).toBe('15 Minuten')
  })

  it('gibt "1 Minute" zurück für genau eine Minute', () => {
    const start = new Date('2026-03-02T10:00:00Z')
    const end = new Date('2026-03-02T10:01:00Z')
    expect(formatDuration(start, end)).toBe('1 Minute')
  })

  it('gibt Stunden zurück für exakte Stunden', () => {
    const start = new Date('2026-03-02T10:00:00Z')
    const end = new Date('2026-03-02T12:00:00Z')
    expect(formatDuration(start, end)).toBe('2 Stunden')
  })

  it('gibt "1 Stunde" zurück für genau eine Stunde', () => {
    const start = new Date('2026-03-02T10:00:00Z')
    const end = new Date('2026-03-02T11:00:00Z')
    expect(formatDuration(start, end)).toBe('1 Stunde')
  })

  it('gibt Stunden und Minuten zurück', () => {
    const start = new Date('2026-03-02T10:00:00Z')
    const end = new Date('2026-03-02T13:20:00Z')
    expect(formatDuration(start, end)).toBe('3 Std. 20 Min.')
  })

  it('gibt Tage zurück für lange Dauern', () => {
    const start = new Date('2026-03-01T10:00:00Z')
    const end = new Date('2026-03-03T10:00:00Z')
    expect(formatDuration(start, end)).toBe('2 Tage')
  })

  it('gibt "1 Tag" zurück für genau einen Tag', () => {
    const start = new Date('2026-03-01T10:00:00Z')
    const end = new Date('2026-03-02T10:00:00Z')
    expect(formatDuration(start, end)).toBe('1 Tag')
  })

  it('gibt "0 Minuten" zurück für gleiche Zeitpunkte', () => {
    const date = new Date('2026-03-02T10:00:00Z')
    expect(formatDuration(date, date)).toBe('0 Minuten')
  })
})

describe('formatActiveSince', () => {
  it('gibt "Aktiv seit X" String zurück', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-02T12:30:00Z'))

    const start = new Date('2026-03-02T10:00:00Z')
    expect(formatActiveSince(start)).toBe('Aktiv seit 2 Std. 30 Min.')

    vi.useRealTimers()
  })

  it('zeigt Minuten für kurze Dauer', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-02T10:05:00Z'))

    const start = new Date('2026-03-02T10:00:00Z')
    expect(formatActiveSince(start)).toBe('Aktiv seit 5 Minuten')

    vi.useRealTimers()
  })
})
