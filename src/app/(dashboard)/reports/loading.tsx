import { Skeleton, SkeletonReportList } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading reports">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Reports list */}
      <SkeletonReportList count={10} />

      <span className="sr-only">Loading reports list...</span>
    </div>
  );
}
