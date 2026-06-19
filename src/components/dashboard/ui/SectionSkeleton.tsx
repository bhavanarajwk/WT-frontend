import { Skeleton } from "@/components/ui/skeleton";

export function FormFieldsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-wt-border p-3" aria-hidden>
      <div className="flex gap-3 border-b border-wt-border pb-2">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 py-1">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4" aria-hidden>
      <div className="flex min-w-0 flex-1 items-start gap-5">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  );
}

export function ProfileDetailsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-7" aria-hidden>
      <div>
        <Skeleton className="mb-3 h-4 w-56" />
        <div className="space-y-3 rounded-xl border border-wt-border bg-wt-surface-2/50 p-6">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <Skeleton className="h-4 w-32 shrink-0" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
