import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function SuppliersLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="flex flex-wrap gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-28" />
      </div>
      <SkeletonTable rows={5} cols={6} />
    </div>
  );
}
