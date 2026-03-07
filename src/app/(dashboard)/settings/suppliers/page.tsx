import { getClients } from '../clients/actions';
import { getSuppliers } from './actions';
import { SuppliersTable } from './suppliers-table';

export default async function SuppliersPage() {
  const [suppliersResult, clientsResult] = await Promise.all([
    getSuppliers(),
    getClients(),
  ]);
  const suppliers = suppliersResult.success ? suppliersResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ניהול ספקים</h1>
      {!suppliersResult.success && (
        <p className="text-sm text-red-600 mb-4">{suppliersResult.error}</p>
      )}
      <SuppliersTable suppliers={suppliers} clients={clients} />
    </div>
  );
}
