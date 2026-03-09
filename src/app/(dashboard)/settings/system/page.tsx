import { getDictionary } from '@/lib/i18n/server';
import { SystemSettings } from './system-settings';

export default async function SystemSettingsPage() {
  const t = await getDictionary();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t.systemSettings.title}
      </h1>
      <SystemSettings />
    </div>
  );
}
