import { DataTable, StatusBadge, EmptyState, Button } from 'mechiron';

/** The RFQ dashboard table — the app's canonical DataTable use. */
export function RfqList() {
  const rows = [
    { id: '1', client: 'אלביט מערכות', sn: '999888444', rev: '00', qty: 545, status: 'in_progress' as const, date: '15.09.2026', sent: '2/2 נשלחו' },
    { id: '2', client: 'נוגה מוצרים רפואיים בע"מ', sn: '123123123', rev: '00', qty: 333, status: 'in_progress' as const, date: '15.09.2026', sent: '1/1 נשלחו' },
    { id: '3', client: 'אלביט מערכות', sn: '650-19-00115', rev: '01', qty: 200, status: 'draft' as const, date: '11.07.2026', sent: '—' },
    { id: '4', client: 'נוגה מוצרים רפואיים בע"מ', sn: '434343434', rev: '00', qty: 999, status: 'completed' as const, date: '17.09.2026', sent: '1/1 נשלחו' },
  ];

  return (
    <div dir="rtl">
      <DataTable headers={['לקוח', 'מק"ט', 'רוויזיה', 'כמות', 'סטטוס', 'תאריך', 'שליחה']}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.client}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.sn}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.rev}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.qty}</td>
            <td className="px-4 py-3">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.date}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.sent}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

/** Left-to-right, showing the same table reads correctly in English. */
export function Suppliers() {
  const rows = [
    { id: '1', name: 'BTI Metal Center Ltd.', domain: 'Raw material', contact: '—', email: 'lab.agamim@gmail.com' },
    { id: '2', name: 'Green coat ALGAT', domain: 'Coating', contact: 'Tal', email: 'tal@chrom.co.il' },
    { id: '3', name: 'Chromat Thermal Treatments', domain: 'Hardening', contact: '—', email: 'cs@chromat.co.il' },
  ];

  return (
    <DataTable headers={['Name', 'Domain', 'Contact', 'Email']}>
      {rows.map((r) => (
        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.domain}</td>
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.contact}</td>
          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.email}</td>
        </tr>
      ))}
    </DataTable>
  );
}

/** isEmpty swaps the whole table for the empty state. */
export function Empty() {
  return (
    <div dir="rtl">
      <DataTable
        headers={['לקוח', 'מק"ט', 'סטטוס']}
        isEmpty
        emptyState={
          <EmptyState
            title="אין בקשות הצעת מחיר"
            description="צור בקשה חדשה כדי להתחיל לאסוף הצעות מספקים."
            action={<Button>+ בקשה חדשה</Button>}
          />
        }
      >
        {null}
      </DataTable>
    </div>
  );
}
