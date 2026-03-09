import { getDictionary } from '@/lib/i18n/server';
import { getClients } from '../clients/actions';
import { getSuppliers } from './actions';
import { SuppliersTable } from './suppliers-table';

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.suppliers.title };
}

export default async function SuppliersPage() {
  const [suppliersResult, clientsResult, t] = await Promise.all([
    getSuppliers(),
    getClients(),
    getDictionary(),
  ]);
  const suppliers = suppliersResult.success ? suppliersResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t.suppliers.title}</h1>
      {!suppliersResult.success && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{suppliersResult.error}</p>
      )}
      <SuppliersTable suppliers={suppliers} clients={clients} />
    </div>
  );
}
