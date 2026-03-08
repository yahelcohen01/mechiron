'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRevision, RFQ_DOMAINS } from '@/lib/types';
import { DomainSection } from './domain-section';
import { updateRfqStatus, type RfqPageData } from './actions';

type RfqDetailViewProps = {
  data: RfqPageData;
};

function DrawingLightbox({ url, filename, isImage, onClose }: { url: string; filename: string; isImage: boolean; onClose: () => void }) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 end-4 text-white hover:text-gray-300 text-3xl font-light leading-none z-10"
        aria-label="סגור"
      >
        &times;
      </button>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={filename} className="max-h-[80vh] sm:max-h-[90vh] max-w-[90vw] object-contain" />
        ) : (
          <iframe src={url} className="w-[90vw] h-[90vh] rounded-lg bg-white" />
        )}
        <a
          href={url}
          download={filename}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          הורד שרטוט
        </a>
      </div>
    </div>
  );
}

function DrawingPreview({ rfq }: { rfq: RfqPageData['rfq'] }) {
  const [showLightbox, setShowLightbox] = useState(false);

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
    <>
      <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div onClick={() => setShowLightbox(true)} className="cursor-zoom-in">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rfq.drawing_signed_url}
              alt={rfq.drawing_filename}
              className="max-h-96 w-full object-contain rounded-lg"
            />
          ) : (
            <iframe
              src={rfq.drawing_signed_url}
              className="w-full h-96 rounded-lg border border-gray-200 pointer-events-none"
            />
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{rfq.drawing_filename}</p>
          <a
            href={rfq.drawing_signed_url}
            download={rfq.drawing_filename}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            הורד שרטוט
          </a>
        </div>
      </div>
      {showLightbox && (
        <DrawingLightbox
          url={rfq.drawing_signed_url}
          filename={rfq.drawing_filename}
          isImage={isImage}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
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
        toast.success('הבקשה סומנה כהושלמה');
        router.refresh();
      } else {
        setError(result.error);
        toast.error('שגיאה בעדכון הסטטוס');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
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
            />
          );
        })}
      </div>
    </div>
  );
}
