import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-4 w-32 mb-1" />
      <Skeleton className="h-8 w-56 mb-6" />
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6">
        <Skeleton className="h-10 w-full sm:w-48" />
        <Skeleton className="h-10 w-full sm:w-48" />
        <div className="flex-1 hidden sm:block" />
        <Skeleton className="h-10 w-32" />
      </div>
      <SkeletonTable rows={6} cols={7} />
    </div>
  );
}
