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

      {/* Desktop members table */}
      <div className="hidden md:block">
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
      </div>

      {/* Mobile members cards */}
      <div className="md:hidden flex flex-col gap-3">
        {members.map((member) => (
          <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">{member.full_name}</span>
              <span className="text-xs text-gray-500">
                {member.role === 'admin' ? 'מנהל' : member.role}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-600">
              <span dir="ltr" className="text-start">{member.email}</span>
              <span className="text-xs text-gray-400">הצטרף {formatDate(member.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-gray-700">הזמנות ממתינות</h3>

          {/* Desktop invites table */}
          <div className="hidden md:block">
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

          {/* Mobile invites cards */}
          <div className="md:hidden flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <span className="text-sm text-gray-900 block mb-2" dir="ltr">{invite.email}</span>
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>נשלח: {formatDate(invite.created_at)}</span>
                  <span>תוקף: {formatDate(invite.expires_at)}</span>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
