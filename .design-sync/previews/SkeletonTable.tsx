import { SkeletonTable } from 'mechiron';

/** The loading placeholder for a full DataTable — header strip plus rows. */
export function Default() {
  return <SkeletonTable />;
}

/** Sized to the table it replaces: the RFQ dashboard is 7 columns. */
export function RfqDashboardShape() {
  return <SkeletonTable rows={4} cols={7} />;
}

export function Compact() {
  return <SkeletonTable rows={2} cols={3} />;
}
