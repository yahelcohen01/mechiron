import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRfqPageData } from './actions';
import { RfqDetailView } from './rfq-detail';

// generateMetadata and the page both need this data; React.cache dedupes them
// into a single fetch per request instead of running getRfqPageData twice.
const loadRfqPageData = cache(getRfqPageData);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await loadRfqPageData(id);
  if (result.success && result.data) {
    return { title: `מק"ט: ${result.data.rfq.serial_number}` };
  }
  return { title: 'בקשת הצעת מחיר' };
}

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadRfqPageData(id);

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
