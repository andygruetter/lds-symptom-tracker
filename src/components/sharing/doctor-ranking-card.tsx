import type {
  MedicationRankingEntry,
  SymptomRankingEntry,
} from '@/types/analytics'

type Props = {
  entry: SymptomRankingEntry | MedicationRankingEntry
  variant: 'symptom' | 'medication'
}

function TrendArrow({
  trend,
}: {
  trend: 'increasing' | 'stable' | 'decreasing'
}) {
  if (trend === 'increasing') {
    return <span className="text-[#C06A3C]">↑</span>
  }
  if (trend === 'decreasing') {
    return <span className="text-[#2A7A65]">↓</span>
  }
  return <span className="text-[#5A6270]">→</span>
}

function Sparkline({
  counts,
  color,
}: {
  counts: { count: number }[]
  color: string
}) {
  if (counts.length < 2) return null

  const maxCount = Math.max(...counts.map((c) => c.count), 1)
  const width = 60
  const height = 20
  const padding = 2

  const points = counts.map((c, i) => {
    const x = padding + (i / (counts.length - 1)) * (width - padding * 2)
    const y = height - padding - (c.count / maxCount) * (height - padding * 2)
    return { x, y }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  const fillPoints = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${height}`,
    `${points[0].x},${height}`,
  ].join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polygon points={fillPoints} fill={color} fillOpacity={0.2} />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DoctorRankingCard({ entry, variant }: Props) {
  const accentColor = variant === 'symptom' ? '#C06A3C' : '#4A7FA5'
  const avgIntensity =
    variant === 'symptom' ? (entry as SymptomRankingEntry).avgIntensity : null

  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2"
      style={{ borderLeft: `4px solid ${accentColor}`, minHeight: 44 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{entry.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="font-bold">{entry.totalCount}x</span>
          <TrendArrow trend={entry.trend} />
        </div>
      </div>
      {(avgIntensity !== null || entry.monthlyCounts.length >= 2) && (
        <div className="mt-1 flex items-center justify-between">
          {avgIntensity !== null ? (
            <span className="text-sm text-muted-foreground">
              ∅ {avgIntensity.toFixed(1)}/10
            </span>
          ) : (
            <span />
          )}
          <Sparkline counts={entry.monthlyCounts} color={accentColor} />
        </div>
      )}
    </div>
  )
}
