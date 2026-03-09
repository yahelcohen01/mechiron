'use client';

import type { RfqStatus } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const variants = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
} as const;

type BadgeProps = {
  variant?: keyof typeof variants;
  children: React.ReactNode;
};

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

const STATUS_VARIANT_MAP: Record<RfqStatus, keyof typeof variants> = {
  draft: 'gray',
  in_progress: 'blue',
  completed: 'green',
};

export function StatusBadge({ status }: { status: RfqStatus }) {
  const t = useT();
  const statusLabelMap: Record<RfqStatus, string> = {
    draft: t.rfqDashboard.statusDraft,
    in_progress: t.rfqDashboard.statusInProgress,
    completed: t.rfqDashboard.statusCompleted,
  };
  return <Badge variant={STATUS_VARIANT_MAP[status]}>{statusLabelMap[status]}</Badge>;
}
