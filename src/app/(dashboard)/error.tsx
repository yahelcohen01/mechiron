'use client';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/locale-context';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t.common.errorTitle}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t.common.errorDesc}
        </p>
        <Button onClick={reset}>{t.common.tryAgain}</Button>
      </div>
    </div>
  );
}
