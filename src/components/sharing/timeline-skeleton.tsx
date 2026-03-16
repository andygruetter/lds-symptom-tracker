import { Skeleton } from '@/components/ui/skeleton'

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Day group 1 */}
      <div>
        <Skeleton className="mb-2 h-4 w-36" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      {/* Day group 2 */}
      <div>
        <Skeleton className="mb-2 h-4 w-36" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      {/* Day group 3 */}
      <div>
        <Skeleton className="mb-2 h-4 w-36" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
