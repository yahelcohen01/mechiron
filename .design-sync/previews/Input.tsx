import { Input } from 'mechiron';

export function WithLabel() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <Input label="מק&quot;ט" placeholder="הזן מק&quot;ט" />
      <Input label="כמות בסיס" type="number" placeholder="הזן כמות" />
    </div>
  );
}

export function States() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
      <Input label="שם לקוח" defaultValue="אלביט מערכות" />
      <Input label="רוויזיה" defaultValue="02" disabled />
      <Input label="אימייל" defaultValue="not-an-email" error="כתובת אימייל לא תקינה" />
    </div>
  );
}

export function Unlabelled() {
  return (
    <div dir="rtl" style={{ maxWidth: 360 }}>
      <Input placeholder="חיפוש לפי מק&quot;ט או לקוח" />
    </div>
  );
}
