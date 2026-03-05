import type { RfqStatus } from '@/lib/types';

const variants = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
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

export const STATUS_BADGE_MAP: Record<RfqStatus, { label: string; variant: keyof typeof variants }> = {
  draft: { label: 'טיוטה', variant: 'gray' },
  in_progress: { label: 'בתהליך', variant: 'blue' },
  completed: { label: 'הושלם', variant: 'green' },
};

export function StatusBadge({ status }: { status: RfqStatus }) {
  const { label, variant } = STATUS_BADGE_MAP[status];
  return <Badge variant={variant}>{label}</Badge>;
}
