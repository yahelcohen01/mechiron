'use client';

import { useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import type { DomainSupplierItem } from './actions';

type SupplierRowProps = {
  item: DomainSupplierItem;
  onAdd: () => void;
  onRemove: () => void;
};

export function SupplierRow({ item, onAdd, onRemove }: SupplierRowProps) {
  const [isPending, startTransition] = useTransition();
  const { supplier, rfq_request_id, rfq_request_status, is_approved } = item;

  const isSent = rfq_request_status === 'sent';
  const isAdded = rfq_request_id !== null;

  function handleToggle() {
    startTransition(() => {
      if (isAdded) {
        onRemove();
      } else {
        onAdd();
      }
    });
  }

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50">
      <input
        type="checkbox"
        checked={isAdded}
        disabled={isSent || isPending}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{supplier.name}</span>
          {is_approved && (
            <Badge variant="green">מאושר</Badge>
          )}
          {!is_approved && isAdded && (
            <Badge variant="gray">חד-פעמי</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{supplier.email}</p>
      </div>
      {isSent && (
        <Badge variant="blue">נשלח</Badge>
      )}
      {isAdded && !isSent && (
        <Badge variant="gray">ממתין</Badge>
      )}
    </div>
  );
}
