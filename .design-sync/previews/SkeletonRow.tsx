import { SkeletonRow } from 'mechiron';

/* SkeletonRow renders a <tr>, so it must live inside a table. */

export function InTable() {
  return (
    <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </tbody>
    </table>
  );
}

/** cols matches the column count of the table it stands in for. */
export function ThreeColumns() {
  return (
    <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        <SkeletonRow cols={3} />
        <SkeletonRow cols={3} />
      </tbody>
    </table>
  );
}
