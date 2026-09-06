/** Spinner emas — haqiqiy kontent shakliga mos kulrang bloklar. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-skeleton" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-skeleton" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="col-span-2 h-24 animate-pulse rounded-lg border border-border bg-skeleton" />
        <div className="h-24 animate-pulse rounded-lg border border-border bg-skeleton" />
        <div className="h-24 animate-pulse rounded-lg border border-border bg-skeleton" />
      </div>

      <div className="h-64 animate-pulse rounded-lg border border-border bg-skeleton" />
    </div>
  );
}
