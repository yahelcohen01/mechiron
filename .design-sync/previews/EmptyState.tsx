import { EmptyState, Button } from 'mechiron';

/** Title + description + a call to action — the full form. */
export function WithAction() {
  return (
    <div dir="rtl">
      <EmptyState
        title="אין בקשות הצעת מחיר"
        description="צור בקשה חדשה כדי להתחיל לאסוף הצעות מספקים."
        action={<Button>+ בקשה חדשה</Button>}
      />
    </div>
  );
}

/** No action — for filtered views where the fix is changing the filter. */
export function TitleAndDescription() {
  return (
    <div dir="rtl">
      <EmptyState
        title="לא נמצאו ספקים"
        description="אין ספקים בתחום זה. נסה תחום אחר או הוסף ספק חדש."
      />
    </div>
  );
}

export function TitleOnly() {
  return (
    <div dir="rtl">
      <EmptyState title="אין תוצאות" />
    </div>
  );
}
