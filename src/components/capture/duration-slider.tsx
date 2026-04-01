'use client'

import { useState } from 'react'

import {
  DURATION_STEPS,
  formatStepLabel,
  minutesToStepIndex,
  stepIndexToMinutes,
} from '@/lib/utils/duration-steps'

interface DurationSliderProps {
  value?: number
  onChange: (minutes: number) => void
}

export function DurationSlider({ value, onChange }: DurationSliderProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    value !== undefined ? minutesToStepIndex(value) : null,
  )

  const currentLabel =
    selectedIndex !== null
      ? formatStepLabel(stepIndexToMinutes(selectedIndex))
      : null

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedIndex(Number(e.target.value))
  }

  function handleCommit() {
    if (selectedIndex !== null) {
      onChange(stepIndexToMinutes(selectedIndex))
    }
  }

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="flex h-5 items-center justify-center">
        {currentLabel ? (
          <span className="text-xs font-medium text-foreground">
            {currentLabel}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Bitte Dauer angeben
          </span>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={DURATION_STEPS.length - 1}
        step={1}
        value={selectedIndex ?? 0}
        onChange={handleChange}
        onPointerUp={handleCommit}
        aria-label="Symptomdauer"
        aria-valuetext={currentLabel ?? 'Nicht gesetzt'}
        className={`min-h-[44px] w-full accent-[#3A856F]${selectedIndex === null ? ' opacity-40' : ''}`}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{'< 30s'}</span>
        <span>24 Std.</span>
      </div>
    </div>
  )
}
