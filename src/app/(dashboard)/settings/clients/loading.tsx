import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';

export default function ClientsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="flex justify-end mb-4">
        <Skeleton className="h-10 w-28" />
      </div>
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}
