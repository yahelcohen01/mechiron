'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Client } from '@/lib/types';
import { createClient, updateClient } from './actions';

type ClientFormProps = {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
};

export function ClientForm({ open, onClose, client }: ClientFormProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditing = !!client;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = isEditing
      ? await updateClient(client!.id, formData)
      : await createClient(formData);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'עריכת לקוח' : 'לקוח חדש'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="שם לקוח"
          name="name"
          required
          defaultValue={client?.name}
          placeholder="הזן שם לקוח"
        />
        <Input
          label="איש קשר"
          name="contact_name"
          defaultValue={client?.contact_name ?? ''}
          placeholder="שם איש קשר"
        />
        <Input
          label="אימייל"
          name="contact_email"
          type="email"
          defaultValue={client?.contact_email ?? ''}
          placeholder="email@example.com"
          dir="ltr"
        />
        <Input
          label="טלפון"
          name="contact_phone"
          type="tel"
          defaultValue={client?.contact_phone ?? ''}
          placeholder="050-0000000"
          dir="ltr"
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
