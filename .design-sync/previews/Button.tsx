import { Button } from 'mechiron';

export function Variants() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="primary">+ בקשה חדשה</Button>
      <Button variant="secondary">ביטול</Button>
      <Button variant="danger">מחיקה</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button size="sm">שמור טיוטה</Button>
      <Button size="md">שמור טיוטה</Button>
      <Button size="lg">שמור טיוטה</Button>
    </div>
  );
}

export function Disabled() {
  return (
    <div dir="rtl" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button disabled>שולח…</Button>
      <Button variant="secondary" disabled>
        ביטול
      </Button>
      <Button variant="danger" disabled>
        מוחק…
      </Button>
    </div>
  );
}

export function InEnglish() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button variant="primary">Send to suppliers</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="danger">Delete</Button>
    </div>
  );
}
