'use client'

import { useMemo } from 'react'

import { cn } from '@/lib/utils'

interface AudioWaveformProps {
  analyserData: Uint8Array | null
  duration: number
  isWarning?: boolean
}

const BAR_COUNT = 24

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function AudioWaveform({
  analyserData,
  duration,
  isWarning = false,
}: AudioWaveformProps) {
  const bars = useMemo(() => {
    if (!analyserData || analyserData.length === 0) {
      return Array(BAR_COUNT).fill(4) as number[]
    }

    const step = Math.floor(analyserData.length / BAR_COUNT)
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const value = analyserData[i * step] ?? 128
      // Map 0-255 (128=silence) to 4-32 px height
      const amplitude = Math.abs(value - 128) / 128
      return Math.max(4, Math.round(amplitude * 32))
    })
  }, [analyserData])

  return (
    <div className="flex items-center gap-3">
      {/* Waveform bars */}
      <div className="flex flex-1 items-center justify-center gap-[2px]">
        {bars.map((height, i) => (
          <div
            key={i}
            className={cn(
              'w-[3px] rounded-full transition-all duration-75',
              isWarning ? 'bg-destructive' : 'bg-[#C06A3C]',
            )}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      {/* Duration display */}
      <span
        className={cn(
          'min-w-[3rem] text-right font-mono text-sm',
          isWarning ? 'text-destructive' : 'text-foreground',
        )}
      >
        {formatDuration(duration)}
      </span>
    </div>
  )
}
