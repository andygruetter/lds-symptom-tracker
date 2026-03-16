import { Document, Image, Page, Text, View } from '@react-pdf/renderer'

import type {
  FeedSymptomGroup,
  MonthTimeline,
  SymptomRankingEntry,
} from '@/types/analytics'
import type { PdfEventDetail, PdfReportData } from '@/types/report'

import { pdfStyles } from './pdf-styles'

const TREND_LABELS: Record<string, string> = {
  increasing: '↑ Steigend',
  stable: '→ Stabil',
  decreasing: '↓ Sinkend',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  return `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('de-CH', {
    month: 'long',
    year: 'numeric',
  })
}

// ─── Header ──────────────────────────────────────────────────────────────────

function ReportHeader({
  dateFrom,
  dateTo,
  generatedAt,
}: {
  dateFrom: string
  dateTo: string
  generatedAt: string
}) {
  return (
    <View style={pdfStyles.header}>
      <Text style={pdfStyles.headerTitle}>Symptom-Report</Text>
      <View>
        <Text style={pdfStyles.headerMeta}>
          Zeitraum: {formatDateRange(dateFrom, dateTo)}
        </Text>
        <Text style={pdfStyles.headerMeta}>
          Erstellt am {formatDate(generatedAt)}
        </Text>
      </View>
    </View>
  )
}

// ─── Summary Section ──────────────────────────────────────────────────────────

function SummarySection({ summary }: { summary: string }) {
  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>KI-Zusammenfassung</Text>
      <Text style={pdfStyles.summaryText}>{summary}</Text>
    </View>
  )
}

// ─── Symptom Ranking ──────────────────────────────────────────────────────────

function RankingSection({ ranking }: { ranking: SymptomRankingEntry[] }) {
  if (ranking.length === 0) {
    return (
      <View>
        <Text style={pdfStyles.sectionTitle}>Symptom-Ranking</Text>
        <Text style={pdfStyles.tableCell}>
          Keine Symptome im Zeitraum erfasst.
        </Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>Symptom-Ranking</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colRank]}>#</Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colName]}>
            Symptom
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colCount]}>
            Häufigkeit
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colTrend]}>
            Trend
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colIntensity]}>
            Ø Intensität
          </Text>
        </View>
        {ranking.map((entry, index) => (
          <View key={entry.name} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, pdfStyles.colRank]}>
              {index + 1}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colName]}>
              {entry.name}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colCount]}>
              {entry.totalCount}x
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colTrend]}>
              {TREND_LABELS[entry.trend] ?? entry.trend}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colIntensity]}>
              {entry.avgIntensity !== null
                ? `${entry.avgIntensity.toFixed(1)} / 10`
                : '–'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Timeline Section ─────────────────────────────────────────────────────────

function TimelineSection({ timeline }: { timeline: MonthTimeline[] }) {
  if (timeline.length === 0) {
    return (
      <View>
        <Text style={pdfStyles.sectionTitle}>Timeline-Übersicht</Text>
        <Text style={pdfStyles.tableCell}>
          Keine Daten im Zeitraum erfasst.
        </Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>Timeline-Übersicht</Text>
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colMonth]}>
            Monat
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colSymptoms]}>
            Symptome
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colMedications]}>
            Medikamente
          </Text>
          <Text style={[pdfStyles.tableHeaderCell, pdfStyles.colTotal]}>
            Total
          </Text>
        </View>
        {timeline.map((month) => (
          <View key={`${month.year}-${month.month}`} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, pdfStyles.colMonth]}>
              {formatMonthLabel(month.year, month.month)}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colSymptoms]}>
              {month.days.reduce((sum, d) => sum + d.symptomCount, 0)}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colMedications]}>
              {month.days.reduce((sum, d) => sum + d.medicationCount, 0)}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.colTotal]}>
              {month.totalEvents}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Event Detail Card ────────────────────────────────────────────────────────

function SymptomGroupLine({ group }: { group: FeedSymptomGroup }) {
  const metaParts: string[] = []
  if (group.bodyRegion) metaParts.push(group.bodyRegion)
  if (group.side) metaParts.push(group.side)
  if (group.intensity !== null) metaParts.push(`${group.intensity}/10`)
  if (group.symptomType) metaParts.push(group.symptomType)

  return (
    <View>
      <Text style={pdfStyles.eventTitle}>{group.symptomName ?? 'Symptom'}</Text>
      {metaParts.length > 0 && (
        <Text style={pdfStyles.eventMeta}>{metaParts.join(' · ')}</Text>
      )}
    </View>
  )
}

function EventCard({ event }: { event: PdfEventDetail }) {
  const isMultiSymptom =
    event.eventType === 'symptom' && event.symptoms.length > 1

  const singleTitle =
    event.eventType === 'medication'
      ? (event.medication ?? 'Medikament')
      : (event.symptomName ?? 'Symptom')

  const singleMetaParts: string[] = []
  if (!isMultiSymptom) {
    if (event.bodyRegion) singleMetaParts.push(event.bodyRegion)
    if (event.side) singleMetaParts.push(event.side)
    if (event.intensity !== null)
      singleMetaParts.push(`Intensität: ${event.intensity}/10`)
  }
  if (event.endedAt) {
    const durationMs =
      new Date(event.endedAt).getTime() - new Date(event.occurredAt).getTime()
    const durationMin = Math.round(durationMs / 60000)
    if (durationMin > 0) singleMetaParts.push(`Dauer: ${durationMin} Min.`)
  }

  return (
    <View style={pdfStyles.eventCard}>
      <View style={pdfStyles.eventCardHeader}>
        {!isMultiSymptom && (
          <Text style={pdfStyles.eventTitle}>{singleTitle}</Text>
        )}
        <Text style={pdfStyles.eventDate}>{formatDate(event.occurredAt)}</Text>
      </View>
      {isMultiSymptom ? (
        <View>
          {event.symptoms.map((s, i) => (
            <SymptomGroupLine key={i} group={s} />
          ))}
          {singleMetaParts.length > 0 && (
            <Text style={pdfStyles.eventMeta}>
              {singleMetaParts.join(' · ')}
            </Text>
          )}
        </View>
      ) : (
        singleMetaParts.length > 0 && (
          <Text style={pdfStyles.eventMeta}>{singleMetaParts.join(' · ')}</Text>
        )
      )}
      {event.rawInput && (
        <Text style={pdfStyles.eventTranscription}>
          &ldquo;{event.rawInput}&rdquo;
        </Text>
      )}
      {event.photoBase64.length > 0 && (
        <View style={pdfStyles.photosRow}>
          {event.photoBase64.map((b64, i) => (
            <Image
              key={i}
              src={`data:image/jpeg;base64,${b64}`}
              style={pdfStyles.photo}
            />
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Events Section ───────────────────────────────────────────────────────────

function EventsSection({ events }: { events: PdfEventDetail[] }) {
  if (events.length === 0) {
    return (
      <View>
        <Text style={pdfStyles.sectionTitle}>Event-Details</Text>
        <Text style={pdfStyles.tableCell}>Keine Events im Zeitraum.</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={pdfStyles.sectionTitle}>
        Event-Details ({events.length})
      </Text>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </View>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function ReportFooter() {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>
        Symptom-Tracker · Vertraulich · Nur für medizinische Fachkräfte
      </Text>
      <Text
        style={pdfStyles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Seite ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  )
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function SymptomReportDocument({ data }: { data: PdfReportData }) {
  return (
    <Document
      title="Symptom-Report"
      author="Symptom-Tracker"
      subject={`Zeitraum: ${formatDateRange(data.metadata.dateFrom, data.metadata.dateTo)}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <ReportHeader
          dateFrom={data.metadata.dateFrom}
          dateTo={data.metadata.dateTo}
          generatedAt={data.metadata.generatedAt}
        />
        <SummarySection summary={data.summary} />
        <RankingSection ranking={data.ranking} />
        <TimelineSection timeline={data.timeline} />
        <EventsSection events={data.events} />
        <ReportFooter />
      </Page>
    </Document>
  )
}
