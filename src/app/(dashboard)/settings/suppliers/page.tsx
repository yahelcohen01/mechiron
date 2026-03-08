import type { Metadata } from 'next';
import { getClients } from '../clients/actions';
import { getSuppliers } from './actions';
import { SuppliersTable } from './suppliers-table';

export const metadata: Metadata = {
  title: 'ספקים',
};

export default async function SuppliersPage() {
  const [suppliersResult, clientsResult] = await Promise.all([
    getSuppliers(),
    getClients(),
  ]);
  const suppliers = suppliersResult.success ? suppliersResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">ניהול ספקים</h1>
      {!suppliersResult.success && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{suppliersResult.error}</p>
      )}
      <SuppliersTable suppliers={suppliers} clients={clients} />
    </div>
  );
}
