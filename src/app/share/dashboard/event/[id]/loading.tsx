import { Skeleton } from '@/components/ui/skeleton'

export default function EventDetailLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Skeleton className="h-9 w-24 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Badge Skeleton */}
          <Skeleton className="h-7 w-24 rounded-full" />

          {/* Transkription Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>

          {/* Extrahierte Daten Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="rounded-lg border border-border">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border px-4 py-2.5 last:border-0"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
