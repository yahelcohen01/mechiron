import { getRfqs, getClientsForFilter } from './actions';
import { RfqDashboard } from './rfq-dashboard';

export default async function DashboardPage() {
  const [rfqsResult, clientsResult] = await Promise.all([
    getRfqs(),
    getClientsForFilter(),
  ]);

  const rfqs = rfqsResult.success ? rfqsResult.data : [];
  const clients = clientsResult.success ? clientsResult.data : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">בקשות הצעת מחיר</h1>
      {!rfqsResult.success && (
        <p className="text-sm text-red-600 mb-4">{rfqsResult.error}</p>
      )}
      <RfqDashboard rfqs={rfqs} clients={clients} />
    </div>
  );
}
