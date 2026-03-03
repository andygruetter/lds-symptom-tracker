'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface SymptomTagProps {
  label: string
  value: string
  confidence: number
  editable: boolean
  isEditing?: boolean
  options?: string[]
  onStartEdit?: () => void
  onEdit?: (newValue: string) => void
  onCancelEdit?: () => void
}

function getConfidenceBorderColor(confidence: number): string {
  if (confidence >= 85) return 'border-[#3A856F]'
  if (confidence >= 70) return 'border-[#B8913A]'
  return 'border-[#C06A3C]'
}

function getConfidenceDotColor(confidence: number): string {
  if (confidence >= 85) return '#3A856F'
  if (confidence >= 70) return '#B8913A'
  return '#C06A3C'
}

export function SymptomTag({
  label,
  value,
  confidence,
  editable,
  isEditing = false,
  options,
  onStartEdit,
  onEdit,
  onCancelEdit,
}: SymptomTagProps) {
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // L2 fix: Sync editValue when value prop changes (e.g. after server correction)
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const isUncertain = confidence < 85 && editable

  function handleSubmit() {
    if (editValue.trim() && editValue !== value) {
      onEdit?.(editValue.trim())
    } else {
      onCancelEdit?.()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setEditValue(value)
      onCancelEdit?.()
    }
  }

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-foreground/40 px-2.5 py-1">
        <span className="text-xs text-muted-foreground">{label}:</span>
        {options && options.length > 0 ? (
          <select
            value={editValue}
            onChange={(e) => onEdit?.(e.target.value)}
            className="min-h-[44px] min-w-[44px] rounded bg-background px-1 text-xs"
            autoFocus
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] w-24 min-w-[44px] rounded bg-background px-1 text-xs"
            autoFocus
          />
        )}
      </span>
    )
  }

  // Confirmed state (not editable)
  if (!editable) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
        <span className="font-medium">{value}</span>
      </span>
    )
  }

  // Default / Uncertain state (tappable)
  return (
    <button
      type="button"
      role="button"
      aria-label={`${label} ändern`}
      onClick={onStartEdit}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs',
        isUncertain && `border ${getConfidenceBorderColor(confidence)}`,
      )}
    >
      <span
        className="inline-block size-2 rounded-full"
        style={{ backgroundColor: getConfidenceDotColor(confidence) }}
        aria-hidden="true"
      />
      <span className="font-medium">{value}</span>
    </button>
  )
}
