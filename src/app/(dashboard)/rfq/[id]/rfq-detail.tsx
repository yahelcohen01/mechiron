'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRevision, RFQ_DOMAINS } from '@/lib/types';
import { DomainSection } from './domain-section';
import { updateRfqStatus, type RfqPageData } from './actions';

type RfqDetailViewProps = {
  data: RfqPageData;
};

function DrawingPreview({ rfq }: { rfq: RfqPageData['rfq'] }) {
  if (!rfq.drawing_signed_url || !rfq.drawing_filename) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-gray-400">לא הועלה שרטוט</p>
      </div>
    );
  }

  const isImage = /\.(png|jpe?g)$/i.test(rfq.drawing_filename);

  return (
    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {isImage ? (
        <a href={rfq.drawing_signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rfq.drawing_signed_url}
            alt={rfq.drawing_filename}
            className="w-24 h-24 object-contain rounded-lg border border-gray-200 bg-white"
          />
        </a>
      ) : (
        <div className="shrink-0 w-24 h-24 flex items-center justify-center rounded-lg border border-gray-200 bg-white">
          <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-900">{rfq.drawing_filename}</p>
        <a
          href={rfq.drawing_signed_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          צפייה בשרטוט
        </a>
      </div>
    </div>
  );
}

export function RfqDetailView({ data }: RfqDetailViewProps) {
  const router = useRouter();
  const { rfq, domains } = data;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleMarkCompleted() {
    setError('');
    startTransition(async () => {
      const result = await updateRfqStatus(rfq.id, 'completed');
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              מק&quot;ט: {rfq.serial_number}
            </h1>
            <StatusBadge status={rfq.status} />
          </div>
          {rfq.status === 'in_progress' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkCompleted}
              disabled={isPending}
            >
              {isPending ? 'מעדכן...' : 'סמן כהושלם'}
            </Button>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-xs text-gray-500">לקוח</p>
            <p className="text-sm font-medium text-gray-900">{rfq.client_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">רוויזיה</p>
            <p className="text-sm font-medium text-gray-900">{formatRevision(rfq.revision_number)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">כמות בסיס</p>
            <p className="text-sm font-medium text-gray-900">{rfq.base_quantity}</p>
          </div>
        </div>

        {/* Drawing preview — prominent card */}
        <DrawingPreview rfq={rfq} />

        {/* Notes */}
        {rfq.notes && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-700 font-medium mb-1">הערות</p>
            <p className="text-sm text-yellow-900 whitespace-pre-wrap">{rfq.notes}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Domain sections */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">תחומים</h2>
        {RFQ_DOMAINS.map((domain) => {
          const domainData = domains.find((d) => d.domain === domain)!;
          return (
            <DomainSection
              key={domain}
              rfqId={rfq.id}
              baseQuantity={rfq.base_quantity}
              data={domainData}
              serialNumber={rfq.serial_number}
              revisionNumber={rfq.revision_number}
            />
          );
        })}
      </div>
    </div>
  );
}
