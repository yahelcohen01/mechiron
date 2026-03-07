import { notFound } from 'next/navigation';
import { getRfqPageData } from './actions';
import { RfqDetailView } from './rfq-detail';

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getRfqPageData(id);

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-red-600 text-sm">{result.error}</p>
      </div>
    );
  }

  if (!result.data) {
    notFound();
  }

  return <RfqDetailView data={result.data} />;
}
