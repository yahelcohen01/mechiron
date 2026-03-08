import type { Metadata } from 'next';
import { getOrganizationData } from './actions';
import { OrganizationSettings } from './organization-settings';

export const metadata: Metadata = {
  title: 'הגדרות ארגון',
};

export default async function OrganizationSettingsPage() {
  const result = await getOrganizationData();

  if (!result.success) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
        שגיאה בטעינת נתונים: {result.error}
      </div>
    );
  }

  const { account, members, pendingInvites } = result.data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הגדרות ארגון</h1>
      <OrganizationSettings
        account={account}
        members={members}
        pendingInvites={pendingInvites}
      />
    </div>
  );
}
