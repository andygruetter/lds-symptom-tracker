import { Skeleton } from '@/components/ui/skeleton'

function SkeletonCard() {
  return (
    <div
      className="rounded-lg bg-card px-4 py-3 shadow-sm"
      style={{ borderLeft: '3px solid hsl(var(--muted))' }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  )
}

export default function InsightsLoading() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-semibold">Auswertung</h1>
      </div>
      {/* Skeleton-Tabs */}
      <div className="border-b border-border px-4 pt-3 pb-3">
        <div className="flex w-full gap-1 rounded-lg bg-muted p-[3px]">
          <Skeleton className="h-7 flex-1 rounded-md" />
          <Skeleton className="h-7 flex-1 rounded-md" />
          <Skeleton className="h-7 flex-1 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-4 px-4 pb-24 pt-4">
        <Skeleton className="mb-2 h-4 w-16" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
