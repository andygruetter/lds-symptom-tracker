import { describe, expect, it } from 'vitest'

import {
  DURATION_STEPS,
  formatStepLabel,
  minutesToStepIndex,
  stepIndexToMinutes,
} from '@/lib/utils/duration-steps'

describe('DURATION_STEPS', () => {
  it('hat 11 Stufen', () => {
    expect(DURATION_STEPS).toHaveLength(11)
  })

  it('beginnt mit 0 und endet mit 1440', () => {
    expect(DURATION_STEPS[0]).toBe(0)
    expect(DURATION_STEPS[10]).toBe(1440)
  })
})

describe('stepIndexToMinutes', () => {
  it('mappt jeden Index korrekt auf Minuten-Wert', () => {
    expect(stepIndexToMinutes(0)).toBe(0)
    expect(stepIndexToMinutes(1)).toBe(1)
    expect(stepIndexToMinutes(2)).toBe(5)
    expect(stepIndexToMinutes(3)).toBe(15)
    expect(stepIndexToMinutes(4)).toBe(30)
    expect(stepIndexToMinutes(5)).toBe(60)
    expect(stepIndexToMinutes(6)).toBe(120)
    expect(stepIndexToMinutes(7)).toBe(240)
    expect(stepIndexToMinutes(8)).toBe(480)
    expect(stepIndexToMinutes(9)).toBe(720)
    expect(stepIndexToMinutes(10)).toBe(1440)
  })

  it('klemmt auf letzten Wert bei Index > 10', () => {
    expect(stepIndexToMinutes(11)).toBe(1440)
    expect(stepIndexToMinutes(99)).toBe(1440)
  })

  it('klemmt auf ersten Wert bei Index < 0', () => {
    expect(stepIndexToMinutes(-1)).toBe(0)
  })
})

describe('minutesToStepIndex', () => {
  it('mappt exakte Werte auf korrekten Index', () => {
    expect(minutesToStepIndex(0)).toBe(0)
    expect(minutesToStepIndex(1)).toBe(1)
    expect(minutesToStepIndex(5)).toBe(2)
    expect(minutesToStepIndex(15)).toBe(3)
    expect(minutesToStepIndex(30)).toBe(4)
    expect(minutesToStepIndex(60)).toBe(5)
    expect(minutesToStepIndex(120)).toBe(6)
    expect(minutesToStepIndex(240)).toBe(7)
    expect(minutesToStepIndex(480)).toBe(8)
    expect(minutesToStepIndex(720)).toBe(9)
    expect(minutesToStepIndex(1440)).toBe(10)
  })

  it('mappt 90 Minuten auf nächstliegenden Index (120 Min = Index 6)', () => {
    // 90 ist genau zwischen 60 (Index 5) und 120 (Index 6)
    // Abstand zu 60: 30, Abstand zu 120: 30 — bei Gleichstand ergibt sich Index 6
    const result = minutesToStepIndex(90)
    expect(result === 5 || result === 6).toBe(true)
  })

  it('mappt Werte nahe an einer Stufe auf diese Stufe', () => {
    expect(minutesToStepIndex(58)).toBe(5) // näher an 60 (Index 5)
    expect(minutesToStepIndex(4)).toBe(2) // näher an 5 (Index 2, Abstand 1) als an 1 (Index 1, Abstand 3)
  })
})

describe('formatStepLabel', () => {
  it('gibt "< 30 Sek." für Wert 0', () => {
    expect(formatStepLabel(0)).toBe('< 30 Sek.')
  })

  it('gibt "1 Min." für Wert 1', () => {
    expect(formatStepLabel(1)).toBe('1 Min.')
  })

  it('gibt Minuten-Label für Werte < 60', () => {
    expect(formatStepLabel(5)).toBe('5 Min.')
    expect(formatStepLabel(15)).toBe('15 Min.')
    expect(formatStepLabel(30)).toBe('30 Min.')
  })

  it('gibt "1 Std." für Wert 60', () => {
    expect(formatStepLabel(60)).toBe('1 Std.')
  })

  it('gibt Stunden-Labels für alle Stundenwerte', () => {
    expect(formatStepLabel(120)).toBe('2 Std.')
    expect(formatStepLabel(240)).toBe('4 Std.')
    expect(formatStepLabel(480)).toBe('8 Std.')
    expect(formatStepLabel(720)).toBe('12 Std.')
    expect(formatStepLabel(1440)).toBe('24 Std.')
  })
})
