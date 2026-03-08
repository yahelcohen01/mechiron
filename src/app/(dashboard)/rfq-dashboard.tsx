'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import type { RfqListItem, RfqStatus } from '@/lib/types';
import { formatRevision, formatDate } from '@/lib/utils';

type RfqDashboardProps = {
  rfqs: RfqListItem[];
  clients: { id: string; name: string }[];
};

const statusOptions = [
  { value: '', label: 'כל הסטטוסים' },
  { value: 'draft', label: 'טיוטה' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'completed', label: 'הושלם' },
];

export function RfqDashboard({ rfqs, clients }: RfqDashboardProps) {
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const clientOptions = [
    { value: '', label: 'כל הלקוחות' },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  const filtered = rfqs.filter((rfq) => {
    if (statusFilter && rfq.status !== statusFilter) return false;
    if (clientFilter) {
      const client = clients.find((c) => c.id === clientFilter);
      if (client && rfq.client_name !== client.name) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 mb-6">
        <div className="w-full sm:w-48">
          <Select
            options={clientOptions}
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            label="לקוח"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RfqStatus | '')}
            label="סטטוס"
          />
        </div>
        <div className="flex-1 hidden sm:block" />
        <Link href="/rfq/new">
          <Button className="w-full sm:w-auto">+ בקשה חדשה</Button>
        </Link>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          title="אין בקשות הצעת מחיר"
          description="צור בקשה חדשה כדי להתחיל"
          action={
            <Link href="/rfq/new">
              <Button>+ בקשה חדשה</Button>
            </Link>
          }
        />
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block">
          <DataTable
            headers={['לקוח', 'מק"ט', 'רוויזיה', 'כמות', 'סטטוס', 'תאריך', 'שליחה']}
          >
            {filtered.map((rfq) => (
              <tr key={rfq.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                  <Link href={`/rfq/${rfq.id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {rfq.client_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400" dir="ltr">{rfq.serial_number}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatRevision(rfq.revision_number)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{rfq.base_quantity}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={rfq.status} />
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(rfq.created_at)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                  {rfq.total_requests > 0
                    ? `${rfq.sent_requests}/${rfq.total_requests} נשלחו`
                    : '—'}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="md:hidden flex flex-col gap-3">
          {filtered.map((rfq) => (
            <Link
              key={rfq.id}
              href={`/rfq/${rfq.id}`}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">{rfq.client_name}</span>
                <StatusBadge status={rfq.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span dir="ltr">מק&quot;ט: {rfq.serial_number}</span>
                <span>רוו׳ {formatRevision(rfq.revision_number)}</span>
                <span>כמות: {rfq.base_quantity}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(rfq.created_at)}</span>
                <span>
                  {rfq.total_requests > 0
                    ? `${rfq.sent_requests}/${rfq.total_requests} נשלחו`
                    : '—'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
