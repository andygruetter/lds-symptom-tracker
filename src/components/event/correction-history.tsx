'use client'

import { useState } from 'react'

import { ChevronDown, ChevronUp } from 'lucide-react'

import type { Database } from '@/types/database'

type Correction = Database['public']['Tables']['corrections']['Row']

const FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptomname',
  body_region: 'Körperregion',
  side: 'Seite',
  symptom_type: 'Symptomtyp',
  intensity: 'Intensität',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface CorrectionHistoryProps {
  corrections: Correction[]
}

export function CorrectionHistory({ corrections }: CorrectionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (corrections.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground"
        aria-expanded={isOpen}
      >
        <span>
          {corrections.length}{' '}
          {corrections.length === 1 ? 'Änderung' : 'Änderungen'}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="divide-y divide-border px-4 pb-3">
          {corrections.map((correction) => (
            <div key={correction.id} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">
                  {FIELD_LABELS[correction.field_name] ?? correction.field_name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(correction.created_at)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {correction.original_value ?? <em>Nachträglich erfasst</em>}
                </span>
                <span>→</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                  {correction.corrected_value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
