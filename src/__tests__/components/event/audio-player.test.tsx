import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AudioPlayer } from '@/components/event/audio-player'

describe('AudioPlayer', () => {
  it('rendert audio Element mit der übergebenen URL', () => {
    render(<AudioPlayer audioUrl="https://signed.url/audio.webm" />)
    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio!.src).toBe('https://signed.url/audio.webm')
  })

  it('hat nodownload auf controlsList gesetzt', () => {
    render(<AudioPlayer audioUrl="https://signed.url/audio.webm" />)
    const audio = document.querySelector('audio')
    expect(audio).not.toBeNull()
    expect(audio!.getAttribute('controlsList')).toBe('nodownload')
  })
})
