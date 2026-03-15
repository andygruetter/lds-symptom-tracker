import type { SymptomRanking, SymptomRankingEntry } from '@/types/analytics'

import { DoctorRankingCard } from './doctor-ranking-card'

type Props = {
  ranking: SymptomRanking
}

function TrendLabel({
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

function SparklineCell({ counts }: { counts: { count: number }[] }) {
  if (counts.length < 2) return <span className="text-muted-foreground">—</span>

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

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-muted-foreground"
      />
    </svg>
  )
}

export function DoctorRanking({ ranking }: Props) {
  const hasSymptoms = ranking.symptoms.length > 0
  const hasMedications = ranking.medications.length > 0

  if (!hasSymptoms && !hasMedications) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-3 text-lg font-semibold">Symptom-Ranking</h2>
        <p className="text-sm text-muted-foreground">
          Keine Symptome in diesem Zeitraum erfasst.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold">Symptom-Ranking</h2>

      {/* Symptome */}
      {hasSymptoms && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Symptome
          </h3>

          {/* Mobile: Karten-Stapel */}
          <div className="xl:hidden space-y-2">
            {ranking.symptoms.map((entry) => (
              <DoctorRankingCard
                key={entry.name}
                entry={entry}
                variant="symptom"
              />
            ))}
          </div>

          {/* Desktop: Semantische Tabelle */}
          <table className="hidden xl:table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-semibold">Symptom</th>
                <th className="pb-2 font-semibold text-right">Häufigkeit</th>
                <th className="pb-2 font-semibold text-center">Trend</th>
                <th className="pb-2 font-semibold text-right">Ø Intensität</th>
                <th className="pb-2 font-semibold text-right">Verlauf</th>
              </tr>
            </thead>
            <tbody>
              {ranking.symptoms.map((entry) => {
                const avgIntensity = (entry as SymptomRankingEntry).avgIntensity
                return (
                  <tr
                    key={entry.name}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 font-semibold">{entry.name}</td>
                    <td className="py-2 text-right font-bold">
                      {entry.totalCount}x
                    </td>
                    <td className="py-2 text-center">
                      <TrendLabel trend={entry.trend} />
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {avgIntensity !== null
                        ? `${avgIntensity.toFixed(1)}/10`
                        : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <SparklineCell counts={entry.monthlyCounts} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Medikamente */}
      {hasMedications && (
        <section className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Medikamente
          </h3>

          {/* Mobile: Karten-Stapel */}
          <div className="xl:hidden space-y-2">
            {ranking.medications.map((entry) => (
              <DoctorRankingCard
                key={entry.name}
                entry={entry}
                variant="medication"
              />
            ))}
          </div>

          {/* Desktop: Semantische Tabelle */}
          <table className="hidden xl:table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-semibold">Medikament</th>
                <th className="pb-2 font-semibold text-right">Häufigkeit</th>
                <th className="pb-2 font-semibold text-center">Trend</th>
                <th className="pb-2 font-semibold text-right">—</th>
                <th className="pb-2 font-semibold text-right">Verlauf</th>
              </tr>
            </thead>
            <tbody>
              {ranking.medications.map((entry) => (
                <tr
                  key={entry.name}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 font-semibold">{entry.name}</td>
                  <td className="py-2 text-right font-bold">
                    {entry.totalCount}x
                  </td>
                  <td className="py-2 text-center">
                    <TrendLabel trend={entry.trend} />
                  </td>
                  <td className="py-2 text-right text-muted-foreground">—</td>
                  <td className="py-2 text-right">
                    <SparklineCell counts={entry.monthlyCounts} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
