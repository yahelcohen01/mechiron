import { getDictionary } from '@/lib/i18n/server';
import { getOrganizationData } from './actions';
import { OrganizationSettings } from './organization-settings';

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.organization.title };
}

export default async function OrganizationSettingsPage() {
  const [result, t] = await Promise.all([getOrganizationData(), getDictionary()]);

  if (!result.success) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-600 dark:text-red-400">
        {t.rfqDashboard.loadError}: {result.error}
      </div>
    );
  }

  const { account, members, pendingInvites } = result.data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t.organization.title}</h1>
      <OrganizationSettings
        account={account}
        members={members}
        pendingInvites={pendingInvites}
      />
    </div>
  );
}
