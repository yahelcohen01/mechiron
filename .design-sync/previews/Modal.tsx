import { Modal, Button, Input } from 'mechiron';

/* Modal renders a `fixed inset-0` overlay, which resolves against the
 * viewport and escapes a preview cell. A wrapper with a transform creates a
 * containing block, so the real overlay + backdrop render inside the card. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      style={{ position: 'relative', transform: 'translateZ(0)', height: 380, overflow: 'hidden' }}
    >
      {children}
    </div>
  );
}

/** The "new client" dialog from settings — the app's canonical Modal use. */
export function NewClient() {
  return (
    <Stage>
      <Modal open onClose={() => {}} title="לקוח חדש">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="שם לקוח" placeholder="הזן שם לקוח" />
          <Input label="איש קשר" placeholder="שם איש קשר" />
          <Input label="אימייל" type="email" placeholder="email@example.com" dir="ltr" />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="secondary">ביטול</Button>
            <Button>הוספה</Button>
          </div>
        </div>
      </Modal>
    </Stage>
  );
}

/** Destructive confirmation — short body, danger action. */
export function ConfirmDelete() {
  return (
    <Stage>
      <Modal open onClose={() => {}} title="מחיקת ספק">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          למחוק את <strong>Green coat ALGAT</strong>?
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button variant="secondary">ביטול</Button>
          <Button variant="danger">מחיקה</Button>
        </div>
      </Modal>
    </Stage>
  );
}
