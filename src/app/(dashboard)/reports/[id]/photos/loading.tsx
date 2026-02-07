import { Skeleton } from "@/components/ui/skeleton";

export default function PhotosLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading photos">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>

      <span className="sr-only">Loading photos...</span>
    </div>
  );
}
