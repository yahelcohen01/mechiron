import type { ReactNode } from 'react';

type DataTableProps = {
  headers: string[];
  children: ReactNode;
  emptyState?: ReactNode;
  isEmpty?: boolean;
};

export function DataTable({ headers, children, emptyState, isEmpty }: DataTableProps) {
  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-start font-medium text-gray-600 dark:text-gray-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>
      </table>
    </div>
  );
}
