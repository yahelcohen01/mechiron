'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import type { User, PendingInvite } from '@/lib/types';
import { cancelInvite, resendInvite } from './actions';
import { InviteModal } from './invite-modal';

type MembersTableProps = {
  members: User[];
  pendingInvites: PendingInvite[];
};

export function MembersTable({ members, pendingInvites }: MembersTableProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('he-IL');
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
        <h2 className="text-lg font-semibold text-gray-900">חברי צוות</h2>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          הזמן חבר צוות
        </Button>
      </div>

      <DataTable headers={['שם', 'אימייל', 'תפקיד', 'הצטרפות']}>
        {members.map((member) => (
          <tr key={member.id}>
            <td className="px-4 py-3 text-gray-900">{member.full_name}</td>
            <td className="px-4 py-3 text-gray-600" dir="ltr">
              {member.email}
            </td>
            <td className="px-4 py-3 text-gray-600">
              {member.role === 'admin' ? 'מנהל' : member.role}
            </td>
            <td className="px-4 py-3 text-gray-600">{formatDate(member.created_at)}</td>
          </tr>
        ))}
      </DataTable>

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-gray-700">הזמנות ממתינות</h3>
          <DataTable headers={['אימייל', 'תאריך שליחה', 'תוקף', 'פעולות']}>
            {pendingInvites.map((invite) => (
              <tr key={invite.id}>
                <td className="px-4 py-3 text-gray-900" dir="ltr">
                  {invite.email}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(invite.created_at)}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(invite.expires_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionLoading === invite.id}
                      onClick={() => handleResend(invite.id)}
                    >
                      שלח שוב
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionLoading === invite.id}
                      onClick={() => handleCancel(invite.id)}
                    >
                      בטל
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
