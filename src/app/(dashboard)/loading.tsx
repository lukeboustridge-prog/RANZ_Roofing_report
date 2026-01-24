import { Skeleton, SkeletonStats, SkeletonReportList } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats cards */}
      <SkeletonStats />

      {/* Recent reports section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <SkeletonReportList count={5} />
      </div>

      <span className="sr-only">Loading dashboard content...</span>
    </div>
  );
}
