import { getDictionary } from '@/lib/i18n/server';
import { getClients } from './actions';
import { ClientsTable } from './clients-table';

export async function generateMetadata() {
  const t = await getDictionary();
  return { title: t.clients.title };
}

export default async function ClientsPage() {
  const [result, t] = await Promise.all([getClients(), getDictionary()]);
  const clients = result.success ? result.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t.clients.title}</h1>
      {!result.success && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{result.error}</p>
      )}
      <ClientsTable clients={clients} />
    </div>
  );
}
