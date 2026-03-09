'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { inviteMember } from './actions';
import { useT } from '@/lib/i18n/locale-context';

type InviteModalProps = {
  open: boolean;
  onClose: () => void;
};

export function InviteModal({ open, onClose }: InviteModalProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', email);
      const result = await inviteMember(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setEmail('');
      onClose();
    } catch {
      setError(t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.organization.inviteMember}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Input
          label={t.common.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          dir="ltr"
          required
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t.organization.sending : t.organization.sendInvite}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
