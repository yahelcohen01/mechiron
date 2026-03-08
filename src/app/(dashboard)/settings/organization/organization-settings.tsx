'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MembersTable } from './members-table';
import { updateOrganization } from './actions';
import type { Account, User, PendingInvite } from '@/lib/types';

type OrganizationSettingsProps = {
  account: Account;
  members: User[];
  pendingInvites: PendingInvite[];
};

export function OrganizationSettings({
  account,
  members,
  pendingInvites,
}: OrganizationSettingsProps) {
  const [name, setName] = useState(account.name);
  const [senderEmail, setSenderEmail] = useState(account.sender_email);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('sender_email', senderEmail);
      const result = await updateOrganization(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess('הפרטים עודכנו בהצלחה');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('שגיאה לא צפויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Organization details */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">פרטי ארגון</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</p>
          )}

          <Input
            label="שם חברה"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="אימייל שולח"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            dir="ltr"
            required
          />

          <div>
            <Button type="submit" disabled={loading}>
              {loading ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </form>
      </section>

      <hr className="border-gray-200" />

      {/* Members section */}
      <MembersTable members={members} pendingInvites={pendingInvites} />
    </div>
  );
}
