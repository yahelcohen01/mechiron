import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/server';

export default async function DashboardNotFound() {
  const t = await getDictionary();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.common.pageNotFound}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t.common.pageNotFoundDesc}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {t.common.backHome}
        </Link>
      </div>
    </div>
  );
}
