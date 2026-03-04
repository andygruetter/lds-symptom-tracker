import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AudioWaveform } from '@/components/capture/audio-waveform'

describe('AudioWaveform', () => {
  it('rendert Waveform-Balken', () => {
    const data = new Uint8Array(128).fill(128)
    const { container } = render(
      <AudioWaveform analyserData={data} duration={0} />,
    )

    // 24 bars
    const bars = container.querySelectorAll('[style*="height"]')
    expect(bars.length).toBe(24)
  })

  it('zeigt Dauer im MM:SS Format', () => {
    render(<AudioWaveform analyserData={null} duration={65} />)

    expect(screen.getByText('01:05')).toBeInTheDocument()
  })

  it('zeigt 00:00 bei Dauer 0', () => {
    render(<AudioWaveform analyserData={null} duration={0} />)

    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('verwendet Terracotta-Farbe (#C06A3C) normalerweise', () => {
    const data = new Uint8Array(128).fill(128)
    const { container } = render(
      <AudioWaveform analyserData={data} duration={10} />,
    )

    const bars = container.querySelectorAll('[style*="height"]')
    expect(bars[0]?.className).toContain('bg-[#C06A3C]')
  })

  it('verwendet destructive-Farbe bei Warning', () => {
    const data = new Uint8Array(128).fill(128)
    const { container } = render(
      <AudioWaveform analyserData={data} duration={55} isWarning />,
    )

    const bars = container.querySelectorAll('[style*="height"]')
    expect(bars[0]?.className).toContain('bg-destructive')
  })

  it('zeigt Dauer-Text in destructive-Farbe bei Warning', () => {
    render(<AudioWaveform analyserData={null} duration={55} isWarning />)

    const durationEl = screen.getByText('00:55')
    expect(durationEl.className).toContain('text-destructive')
  })

  it('rendert korrekte Balken-Höhen basierend auf Amplitude', () => {
    // Data mit hoher Amplitude (weit weg von 128)
    const data = new Uint8Array(128)
    data[0] = 255 // Max amplitude
    data[5] = 128 // Silence

    const { container } = render(
      <AudioWaveform analyserData={data} duration={5} />,
    )

    const bars = container.querySelectorAll('[style*="height"]')
    // First bar should have max height (32px for max amplitude)
    const firstBarHeight = parseInt(
      bars[0]?.getAttribute('style')?.match(/height: (\d+)px/)?.[1] ?? '0',
    )
    expect(firstBarHeight).toBeGreaterThan(4)
  })

  it('rendert Mindesthöhe bei null analyserData', () => {
    const { container } = render(
      <AudioWaveform analyserData={null} duration={0} />,
    )

    const bars = container.querySelectorAll('[style*="height"]')
    expect(bars.length).toBe(24)
    // All bars should have minimum height (4px)
    bars.forEach((bar) => {
      expect(bar.getAttribute('style')).toContain('height: 4px')
    })
  })
})
