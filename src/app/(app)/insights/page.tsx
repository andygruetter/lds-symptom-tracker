import { Suspense } from 'react'

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { FileDown } from 'lucide-react'

import { InsightsSummaryCard } from '@/components/insights/insights-summary-card'
import { MonthTimeline } from '@/components/insights/month-timeline'
import { SymptomFeed } from '@/components/insights/symptom-feed'
import { SymptomRanking } from '@/components/insights/symptom-ranking'
import { AISummarySkeleton } from '@/components/sharing/ai-summary-skeleton'
import { ShareSheet } from '@/components/sharing/share-sheet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createServerClient } from '@/lib/db/client'
import {
  getChronologicalFeed,
  getMonthlyTimeline,
  getSymptomRanking,
} from '@/lib/db/insights'
import { toLocalDateKey } from '@/lib/utils/date'

export default async function InsightsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const today = new Date()
  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const summaryDateFrom = toLocalDateKey(threeMonthsAgo)
  const summaryDateTo = toLocalDateKey(today)

  const [feed, timeline, ranking] = await Promise.all([
    getChronologicalFeed(supabase, user.id, { limit: 20 }),
    getMonthlyTimeline(
      supabase,
      user.id,
      today.getFullYear(),
      today.getMonth() + 1,
    ),
    getSymptomRanking(supabase, user.id, '3m'),
  ])

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Auswertung</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/export/pdf">
                <FileDown className="mr-1.5 h-4 w-4" />
                PDF
              </Link>
            </Button>
            <ShareSheet />
          </div>
        </div>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <div className="border-b border-border px-4 pt-3">
          <TabsList className="w-full">
            <TabsTrigger value="feed" className="flex-1">
              Feed
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1">
              Ranking
            </TabsTrigger>
            <TabsTrigger value="ki" className="flex-1">
              KI
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="feed">
          <SymptomFeed
            initialEvents={feed.events}
            initialCursor={feed.nextCursor}
            hasMore={feed.hasMore}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <MonthTimeline initialTimeline={timeline} />
        </TabsContent>

        <TabsContent value="ranking">
          <SymptomRanking initialRanking={ranking} />
        </TabsContent>

        <TabsContent value="ki" className="p-4">
          <Suspense fallback={<AISummarySkeleton />}>
            <InsightsSummaryCard
              accountId={user.id}
              dateFrom={summaryDateFrom}
              dateTo={summaryDateTo}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
