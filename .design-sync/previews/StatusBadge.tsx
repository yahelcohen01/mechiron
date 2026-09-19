import { StatusBadge } from 'mechiron';

/* StatusBadge maps an RfqStatus to the right colour AND the localised label,
 * reading the dictionary from the i18n context. The context default is
 * Hebrew, so it renders correctly with no provider. */

export function AllStatuses() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <StatusBadge status="draft" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="completed" />
    </div>
  );
}

/** How it reads in a table cell, next to the row it describes. */
export function InContext() {
  const rows = [
    { sn: '999888444', status: 'in_progress' as const },
    { sn: '650-19-00115', status: 'draft' as const },
    { sn: '434343434', status: 'completed' as const },
  ];
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div key={r.sn} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="text-sm text-gray-600 dark:text-gray-400" style={{ minWidth: 120 }}>
            {r.sn}
          </span>
          <StatusBadge status={r.status} />
        </div>
      ))}
    </div>
  );
}
