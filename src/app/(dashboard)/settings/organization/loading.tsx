import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function OrganizationSettingsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <Skeleton className="h-8 w-48" />

      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>

      <hr className="border-gray-200" />

      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <SkeletonTable rows={3} cols={4} />
      </div>
    </div>
  );
}
