import { Skeleton } from 'mechiron';

/* Skeleton is a sized box: it carries no dimensions of its own, so every use
 * sets height/width through className. */

export function Shapes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

/** Blocks, not just lines — cards and avatars use the same primitive. */
export function Blocks() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, maxWidth: 240 }}>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-20 w-32 rounded-xl" />
    </div>
  );
}
