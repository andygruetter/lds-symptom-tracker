import { Skeleton } from '@/components/ui/skeleton'

function PlaceholderCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <Skeleton className="mb-3 h-6 w-40" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-4 h-10 w-full rounded-md" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <PlaceholderCard />
      <PlaceholderCard />
      <PlaceholderCard />
    </div>
  )
}
