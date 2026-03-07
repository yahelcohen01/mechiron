import type { Metadata } from 'next';
import { getRfqs, getClientsForFilter } from './actions';
import { RfqDashboard } from './rfq-dashboard';
import { getAccountName } from '@/lib/supabase/account';

export const metadata: Metadata = {
  title: 'לוח בקשות',
};

export default async function DashboardPage() {
  const [rfqsResult, clientsResult, accountName] = await Promise.all([
    getRfqs(),
    getClientsForFilter(),
    getAccountName().catch(() => null),
  ]);

  const rfqs = rfqsResult.success ? rfqsResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      {accountName && (
        <p className="text-sm text-gray-500 mb-1">{accountName}</p>
      )}
      <h1 className="text-2xl font-bold mb-6">בקשות הצעת מחיר</h1>
      {!rfqsResult.success && (
        <p className="text-sm text-red-600 mb-4">{rfqsResult.error}</p>
      )}
      <RfqDashboard rfqs={rfqs} clients={clients} />
    </div>
  );
}
