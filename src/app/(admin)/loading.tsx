import { Skeleton, SkeletonStats, SkeletonTable } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading admin panel">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats cards */}
      <SkeletonStats />

      {/* Table section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <SkeletonTable rows={8} />
      </div>

      <span className="sr-only">Loading admin panel...</span>
    </div>
  );
}
