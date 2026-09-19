import { Select } from 'mechiron';

const clients = [
  { value: 'elbit', label: 'אלביט מערכות' },
  { value: 'noga', label: 'נוגה מוצרים רפואיים בע"מ' },
];

const domains = [
  { value: 'raw_material', label: 'חומר גלם' },
  { value: 'coating', label: 'ציפוי' },
  { value: 'passivation', label: 'פסיבציה' },
  { value: 'hardening', label: 'חישול' },
];

export function WithLabel() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <Select label="שם לקוח" options={clients} placeholder="בחר לקוח" defaultValue="" />
      <Select label="תחום" options={domains} defaultValue="coating" />
    </div>
  );
}

/** The dashboard filters — an "all" option rather than a placeholder. */
export function Filters() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <Select
        label="לקוח"
        options={[{ value: '', label: 'כל הלקוחות' }, ...clients]}
        defaultValue=""
      />
      <Select
        label="סטטוס"
        options={[
          { value: '', label: 'כל הסטטוסים' },
          { value: 'draft', label: 'טיוטה' },
          { value: 'in_progress', label: 'בתהליך' },
          { value: 'completed', label: 'הושלם' },
        ]}
        defaultValue=""
      />
    </div>
  );
}

export function States() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <Select label="תחום" options={domains} disabled defaultValue="raw_material" />
      <Select label="תחום" options={domains} defaultValue="" placeholder="בחר תחום" error="יש לבחור תחום" />
    </div>
  );
}
