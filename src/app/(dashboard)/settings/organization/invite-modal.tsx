'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { inviteMember } from './actions';

type InviteModalProps = {
  open: boolean;
  onClose: () => void;
};

export function InviteModal({ open, onClose }: InviteModalProps) {
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
      setError('שגיאה לא צפויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="הזמן חבר צוות">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <Input
          label="אימייל"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          dir="ltr"
          required
        />

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            ביטול
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'שולח...' : 'שלח הזמנה'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
