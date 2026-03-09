'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import type { User, PendingInvite } from '@/lib/types';
import { cancelInvite, resendInvite } from './actions';
import { InviteModal } from './invite-modal';
import { useT, useLocale } from '@/lib/i18n/locale-context';

type MembersTableProps = {
  members: User[];
  pendingInvites: PendingInvite[];
};

export function MembersTable({ members, pendingInvites }: MembersTableProps) {
  const t = useT();
  const locale = useLocale();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US');
  };

  const handleCancel = async (inviteId: string) => {
    setActionLoading(inviteId);
    await cancelInvite(inviteId);
    setActionLoading(null);
  };

  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId);
    await resendInvite(inviteId);
    setActionLoading(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.organization.members}</h2>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          {t.organization.inviteMember}
        </Button>
      </div>

      {/* Desktop members table */}
      <div className="hidden md:block">
        <DataTable headers={[t.common.name, t.common.email, t.organization.role, t.organization.joinedAt]}>
          {members.map((member) => (
            <tr key={member.id}>
              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{member.full_name}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400" dir="ltr">
                {member.email}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {member.role === 'admin' ? t.organization.admin : member.role}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(member.created_at)}</td>
            </tr>
          ))}
        </DataTable>
      </div>

      {/* Mobile members cards */}
      <div className="md:hidden flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900 dark:text-gray-100">{member.full_name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {member.role === 'admin' ? t.organization.admin : member.role}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span dir="ltr" className="text-start">{member.email}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{t.organization.joinedAt} {formatDate(member.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.organization.pendingInvites}</h3>

          {/* Desktop invites table */}
          <div className="hidden md:block">
            <DataTable headers={[t.common.email, t.organization.sentDate, t.organization.expiresAt, t.common.actions]}>
              {pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100" dir="ltr">
                    {invite.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(invite.created_at)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(invite.expires_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionLoading === invite.id}
                        onClick={() => handleResend(invite.id)}
                      >
                        {t.organization.resendInvite}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionLoading === invite.id}
                        onClick={() => handleCancel(invite.id)}
                      >
                        {t.organization.cancelInvite}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>

          {/* Mobile invites cards */}
          <div className="md:hidden flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <span className="text-sm text-gray-900 dark:text-gray-100 block mb-2" dir="ltr">{invite.email}</span>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span>{t.organization.sentDate}: {formatDate(invite.created_at)}</span>
                  <span>{t.organization.expiresAt}: {formatDate(invite.expires_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={actionLoading === invite.id}
                    onClick={() => handleResend(invite.id)}
                  >
                    {t.organization.resendInvite}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={actionLoading === invite.id}
                    onClick={() => handleCancel(invite.id)}
                  >
                    {t.organization.cancelInvite}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
