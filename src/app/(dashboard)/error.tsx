'use client';

import { Button } from '@/components/ui/button';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">שגיאה</h2>
        <p className="text-sm text-gray-600 mb-6">
          אירעה שגיאה בטעינת הדף. נסה לרענן את העמוד.
        </p>
        <Button onClick={reset}>נסה שוב</Button>
      </div>
    </div>
  );
}
