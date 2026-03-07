'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RFQ_DOMAINS, DOMAIN_LABELS_HE, type Supplier, type Client } from '@/lib/types';
import { createSupplier, updateSupplier } from './actions';

const domainOptions = RFQ_DOMAINS.map((d) => ({
  value: d,
  label: DOMAIN_LABELS_HE[d],
}));

type SupplierFormProps = {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  clients: Client[];
};

export function SupplierForm({ open, onClose, supplier, clients }: SupplierFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditing = !!supplier;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateSupplier(supplier!.id, formData)
      : await createSupplier(formData);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    toast.success(isEditing ? 'הספק עודכן בהצלחה' : 'הספק נוצר בהצלחה');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'עריכת ספק' : 'ספק חדש'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="שם ספק"
          name="name"
          required
          defaultValue={supplier?.name}
          placeholder="הזן שם ספק"
        />
        <Input
          label="איש קשר"
          name="contact_name"
          defaultValue={supplier?.contact_name ?? ''}
          placeholder="שם איש קשר"
        />
        <Input
          label="אימייל"
          name="email"
          type="email"
          required
          defaultValue={supplier?.email}
          placeholder="email@example.com"
          dir="ltr"
        />
        <Input
          label="טלפון"
          name="phone"
          type="tel"
          defaultValue={supplier?.phone ?? ''}
          placeholder="050-0000000"
          dir="ltr"
        />
        <Select
          label="תחום"
          name="domain"
          required
          options={domainOptions}
          defaultValue={supplier?.domain ?? ''}
          placeholder="בחר תחום"
        />
        {!isEditing && clients.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">שייך ללקוחות</label>
            <p className="text-xs text-gray-500">אופציונלי — הספק יתווסף כספק מאושר עבור הלקוחות שנבחרו</p>
            <div className="max-h-40 overflow-auto border border-gray-200 rounded-lg p-2 flex flex-col gap-1">
              {clients.map((client) => (
                <label key={client.id} className="flex items-center gap-2 text-sm text-gray-700 py-1 px-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" name="client_ids" value={client.id} className="rounded border-gray-300" />
                  {client.name}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'שומר...' : isEditing ? 'עדכון' : 'הוספה'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
