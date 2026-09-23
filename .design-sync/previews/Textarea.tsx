import { Textarea } from 'mechiron';

/** The RFQ email body — the app's main Textarea use. */
export function EmailBody() {
  return (
    <div dir="rtl" style={{ maxWidth: 460 }}>
      <Textarea
        label="טקסט באימייל"
        rows={6}
        defaultValue={
          'מצורף שרטוט לבקשת הצעת מחיר.\n\nנא להציע מחיר עבור {כמות} יחידות.\nתחום: {ערך}\n\nנודה לקבלת הצעתכם בהקדם.'
        }
      />
    </div>
  );
}

export function States() {
  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
      <Textarea label="הערות" placeholder="הערות נוספות (אופציונלי)" />
      <Textarea label="הערות" defaultValue="נשלח לספק בטלפון" disabled />
      <Textarea label="הערות" defaultValue="" error="שדה חובה" rows={2} />
    </div>
  );
}
