import type { Metadata } from 'next';
import { getClients } from './actions';
import { ClientsTable } from './clients-table';

export const metadata: Metadata = {
  title: 'לקוחות',
};

export default async function ClientsPage() {
  const result = await getClients();
  const clients = result.success ? result.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ניהול לקוחות</h1>
      {!result.success && (
        <p className="text-sm text-red-600 mb-4">{result.error}</p>
      )}
      <ClientsTable clients={clients} />
    </div>
  );
}
