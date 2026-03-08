'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { DOMAIN_LABELS_HE, RFQ_DOMAINS, type Supplier, type RfqDomain } from '@/lib/types';
import {
  getClientApprovals,
  getAvailableSuppliers,
  addApproval,
  removeApproval,
  type ApprovedSupplier,
} from './actions';

type ClientApprovalsProps = {
  clientId: string;
};

export function ClientApprovals({ clientId }: ClientApprovalsProps) {
  const [approvals, setApprovals] = useState<ApprovedSupplier[]>([]);
  const [available, setAvailable] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const didLoad = useRef(false);

  useEffect(() => {
    if (didLoad.current) return;
    didLoad.current = true;

    async function fetchData() {
      const [appResult, availResult] = await Promise.all([
        getClientApprovals(clientId),
        getAvailableSuppliers(clientId),
      ]);

      if (appResult.success) setApprovals(appResult.data);
      if (availResult.success) setAvailable(availResult.data);
      setLoading(false);
    }

    fetchData();
  }, [clientId]);

  async function reload() {
    const [appResult, availResult] = await Promise.all([
      getClientApprovals(clientId),
      getAvailableSuppliers(clientId),
    ]);

    if (appResult.success) setApprovals(appResult.data);
    if (availResult.success) setAvailable(availResult.data);
  }

  async function handleAdd() {
    if (!selectedSupplierId) return;
    setError('');

    const result = await addApproval(clientId, selectedSupplierId);
    if (!result.success) {
      setError(result.error);
      return;
    }

    setSelectedSupplierId('');
    await reload();
  }

  async function handleRemove(supplierId: string) {
    setError('');
    const result = await removeApproval(clientId, supplierId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    await reload();
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 py-4">טוען...</p>;
  }

  // Group approvals by domain
  const grouped = RFQ_DOMAINS.reduce((acc, domain) => {
    const domainSuppliers = approvals.filter((a) => a.domain === domain);
    if (domainSuppliers.length > 0) acc[domain] = domainSuppliers;
    return acc;
  }, {} as Record<RfqDomain, ApprovedSupplier[]>);

  const availableOptions = available.map((s) => ({
    value: s.id,
    label: `${s.name} (${DOMAIN_LABELS_HE[s.domain]})`,
  }));

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">ספקים מאושרים</h4>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>}

      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-gray-400 mb-3">אין ספקים מאושרים עדיין</p>
      )}

      {Object.entries(grouped).map(([domain, suppliers]) => (
        <div key={domain} className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {DOMAIN_LABELS_HE[domain as RfqDomain]}
          </p>
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-full ps-3 pe-1 py-1 text-sm"
              >
                {s.name}
                <button
                  onClick={() => handleRemove(s.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-0.5"
                  title="הסר אישור"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Add supplier */}
      <div className="flex items-end gap-2 mt-3">
        <div className="flex-1">
          <Select
            options={availableOptions}
            placeholder="בחר ספק להוספה"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!selectedSupplierId}
        >
          הוסף
        </Button>
      </div>
    </div>
  );
}
