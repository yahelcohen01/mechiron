'use client';

import { useState, useTransition } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Supplier, RfqDomain } from '@/lib/types';
import { DOMAIN_LABELS_HE } from '@/lib/types';

type AddSupplierModalProps = {
  open: boolean;
  onClose: () => void;
  domain: RfqDomain;
  availableSuppliers: Supplier[];
  onSelectExisting: (supplierId: string) => Promise<void>;
  onCreateNew: (formData: FormData) => Promise<void>;
};

export function AddSupplierModal({
  open,
  onClose,
  domain,
  availableSuppliers,
  onSelectExisting,
  onCreateNew,
}: AddSupplierModalProps) {
  const [tab, setTab] = useState<'select' | 'create'>('select');
  const [isPending, startTransition] = useTransition();
  const [confirmSupplier, setConfirmSupplier] = useState<Supplier | null>(null);
  const [error, setError] = useState('');

  function handleConfirmAdd() {
    if (!confirmSupplier) return;
    setError('');
    startTransition(async () => {
      try {
        await onSelectExisting(confirmSupplier.id);
        setConfirmSupplier(null);
        onClose();
      } catch {
        setError('שגיאה בהוספת ספק');
      }
    });
  }

  function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await onCreateNew(formData);
        onClose();
      } catch {
        setError('שגיאה ביצירת ספק');
      }
    });
  }

  function handleClose() {
    setConfirmSupplier(null);
    setError('');
    setTab('select');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`הוספת ספק — ${DOMAIN_LABELS_HE[domain]}`}>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'select'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => { setTab('select'); setConfirmSupplier(null); setError(''); }}
        >
          בחירת ספק קיים
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'create'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          onClick={() => { setTab('create'); setConfirmSupplier(null); setError(''); }}
        >
          ספק חדש
        </button>
      </div>

      {tab === 'select' && (
        <>
          {confirmSupplier ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                הספק <strong>{confirmSupplier.name}</strong> אינו מאושר עבור לקוח זה.
                הוא יתווסף לשליחה זו בלבד ולא יישמר ברשימת הספקים המאושרים.
              </p>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setConfirmSupplier(null)}
                  disabled={isPending}
                >
                  חזרה
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={isPending}
                >
                  {isPending ? 'מוסיף...' : 'אישור הוספה'}
                </Button>
              </div>
            </div>
          ) : availableSuppliers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">אין ספקים זמינים בתחום זה</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {availableSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-start"
                  onClick={() => setConfirmSupplier(supplier)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{supplier.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{supplier.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'create' && (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <Input label="שם ספק" name="name" required placeholder="הזן שם ספק" />
          <Input label="אימייל" name="email" type="email" required placeholder="הזן אימייל" />
          <Input label="איש קשר" name="contact_name" placeholder="שם איש קשר (אופציונלי)" />
          <Input label="טלפון" name="phone" placeholder="טלפון (אופציונלי)" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">תחום</label>
            <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
              {DOMAIN_LABELS_HE[domain]}
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
              ביטול
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'שומר...' : 'יצירה והוספה'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
