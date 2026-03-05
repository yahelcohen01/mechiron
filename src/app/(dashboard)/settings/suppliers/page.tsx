import { getSuppliers } from './actions';
import { SuppliersTable } from './suppliers-table';

export default async function SuppliersPage() {
  const result = await getSuppliers();
  const suppliers = result.success ? result.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ניהול ספקים</h1>
      {!result.success && (
        <p className="text-sm text-red-600 mb-4">{result.error}</p>
      )}
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
