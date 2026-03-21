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

// Field order for PDF rendering
const PDF_FIELD_ORDER = [
  'symptom_name',
  'body_region',
  'side',
  'symptom_type',
  'intensity',
  'trigger',
  'frequency',
  'status',
  'symptom_time',
  'duration',
  'medication',
  'medication_name',
  'dosage',
  'reason',
  'action',
]

function formatPdfFieldValue(key: string, value: string): string {
  if (key === 'intensity') return `${value}/10`
  if (key === 'duration') {
    const mins = parseInt(value, 10)
    if (!isNaN(mins) && mins > 0) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      if (h > 0 && m > 0) return `${h} Std. ${m} Min.`
      if (h > 0) return `${h} Std.`
      return `${mins} Min.`
    }
  }
  return value
}

const PDF_FIELD_LABELS: Record<string, string> = {
  symptom_name: 'Symptom',
  body_region: 'Region',
  side: 'Seite',
  symptom_type: 'Art',
  intensity: 'Stärke',
  trigger: 'Auslöser',
  frequency: 'Häufigkeit',
  status: 'Verlauf',
  symptom_time: 'Zeitpunkt',
  duration: 'Dauer',
  medication: 'Medikament',
  medication_name: 'Medikament',
  dosage: 'Dosierung',
  reason: 'Grund',
  action: 'Aktion',
}

// ─── Event Detail Card ────────────────────────────────────────────────────────

function SymptomGroupLine({ group }: { group: FeedSymptomGroup }) {
  const entries = Object.entries(group.fields).filter(
    ([k]) => k !== 'symptom_name' && k !== 'medication',
  )
  entries.sort(([a], [b]) => {
    const ia = PDF_FIELD_ORDER.indexOf(a)
    const ib = PDF_FIELD_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  const metaParts = entries.map(([k, v]) => {
    const label = PDF_FIELD_LABELS[k] ?? k
    return `${label}: ${formatPdfFieldValue(k, v)}`
  })

  return (
    <View>
      <Text style={pdfStyles.eventTitle}>{group.displayName ?? 'Symptom'}</Text>
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
    event.symptoms[0]?.displayName ??
    (event.eventType === 'medication' ? 'Medikament' : 'Symptom')

  const singleMetaParts: string[] = []
  if (!isMultiSymptom && event.symptoms[0]) {
    const fields = event.symptoms[0].fields
    const entries = Object.entries(fields).filter(
      ([k]) => k !== 'symptom_name' && k !== 'medication',
    )
    entries.sort(([a], [b]) => {
      const ia = PDF_FIELD_ORDER.indexOf(a)
      const ib = PDF_FIELD_ORDER.indexOf(b)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return a.localeCompare(b)
    })
    for (const [k, v] of entries) {
      const label = PDF_FIELD_LABELS[k] ?? k
      singleMetaParts.push(`${label}: ${formatPdfFieldValue(k, v)}`)
    }
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
