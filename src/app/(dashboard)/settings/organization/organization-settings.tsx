'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MembersTable } from './members-table';
import { updateOrganization } from './actions';
import type { Account, User, PendingInvite } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

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
  const t = useT();
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

      setSuccess(t.organization.updateSuccess);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t.auth.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {/* Organization details */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t.organization.details}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-600 dark:text-green-400">{success}</p>
          )}

          <Input
            label={t.organization.companyName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label={t.organization.senderEmail}
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            dir="ltr"
            required
          />

          <div>
            <Button type="submit" disabled={loading}>
              {loading ? t.common.saving : t.organization.saveChanges}
            </Button>
          </div>
        </form>
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Members section */}
      <MembersTable members={members} pendingInvites={pendingInvites} />
    </div>
  );
}
