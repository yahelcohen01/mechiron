'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RFQ_DOMAINS, DOMAIN_LABELS_HE, type Supplier } from '@/lib/types';
import { createSupplier, updateSupplier } from './actions';

const domainOptions = RFQ_DOMAINS.map((d) => ({
  value: d,
  label: DOMAIN_LABELS_HE[d],
}));

type SupplierFormProps = {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
};

export function SupplierForm({ open, onClose, supplier }: SupplierFormProps) {
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
