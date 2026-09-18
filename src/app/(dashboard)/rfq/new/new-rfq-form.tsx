'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatRevision } from '@/lib/types';
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_UPLOAD_BYTES,
  type CompletedExtraction,
  type ExtractionOutcome,
} from '@/lib/extraction-service/payload';
import {
  getPartsForClient,
  getNextRevision,
  createInlineClient,
  createRfq,
} from './actions';

type ClientOption = { id: string; name: string };
type PartOption = { id: string; serial_number: string; description: string | null };

const NEW_PART_VALUE = '__new__';

/**
 * Shared with the endpoint rather than restated, so the two limits cannot
 * drift into a file the form accepts and the server refuses.
 *
 * Imported from `payload` and not from the module barrel: the barrel reaches
 * `node:crypto` and the Supabase server client, neither of which belongs in a
 * client bundle.
 */
const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;
const ACCEPTED_TYPES: readonly string[] = ACCEPTED_MEDIA_TYPES;

/**
 * How long submit will wait for a read that is still in flight before giving
 * up on it and creating the RFQ anyway. From the spec; the ceiling exists so
 * that a hung gateway can never hold a user's submit hostage.
 */
const EXTRACTION_SUBMIT_GRACE_MS = 15_000;

type NewRfqFormProps = {
  clients: ClientOption[];
};

export function NewRfqForm({ clients: initialClients }: NewRfqFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Client state
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientError, setNewClientError] = useState('');
  const [newClientLoading, setNewClientLoading] = useState(false);

  // Part state
  const [parts, setParts] = useState<PartOption[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);
  const [selectedPartValue, setSelectedPartValue] = useState('');
  const isNewPart = selectedPartValue === NEW_PART_VALUE;

  // Revision
  const [revision, setRevision] = useState<number | null>(null);

  // File
  const [fileError, setFileError] = useState('');

  // Drawing extraction. Findings live here — in client state — and are not
  // persisted anywhere until submit, which is what lets an abandoned form
  // leave no storage object and no database row behind. #15 turns this into
  // visible progress; today it is deliberately invisible. (#14 is the
  // pre-fill, which happens server-side once these findings are persisted.)
  // `extractionResult` is the ref submit reads, not the state: submit may run
  // while a read is still in flight, and a state value captured by that
  // render's closure would be stale by the time the read resolves. The state
  // mirrors it for the progress UI #15 adds.
  const [, setExtraction] = useState<CompletedExtraction | null>(null);
  const extractionResult = useRef<CompletedExtraction | null>(null);
  const extractionInFlight = useRef<Promise<void> | null>(null);
  const extractionRequest = useRef<AbortController | null>(null);

  // Form
  const [error, setError] = useState('');

  function resetExtraction() {
    extractionRequest.current?.abort();
    extractionRequest.current = null;
    extractionInFlight.current = null;
    extractionResult.current = null;
    setExtraction(null);
  }

  async function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    setSelectedPartValue('');
    setRevision(null);
    setParts([]);
    // Changing the client unmounts the file input, so the picked file is gone;
    // findings read under the previous client's permission must go with it.
    resetExtraction();

    if (!newClientId) return;

    setPartsLoading(true);
    const result = await getPartsForClient(newClientId);
    setPartsLoading(false);

    if (result.success) {
      setParts(result.data);
    }
  }

  async function handlePartChange(value: string) {
    setSelectedPartValue(value);

    if (value === NEW_PART_VALUE) {
      setRevision(0);
      return;
    }

    if (!value) {
      setRevision(null);
      return;
    }

    const result = await getNextRevision(value);
    if (result.success) {
      setRevision(result.data);
    }
  }

  async function handleNewClientSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewClientError('');
    setNewClientLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createInlineClient(formData);

    setNewClientLoading(false);

    if (!result.success) {
      setNewClientError(result.error);
      return;
    }

    setClients((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
    setClientId(result.data.id);
    setSelectedPartValue('');
    setRevision(null);
    setParts([]);
    setShowNewClientModal(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('');
    // A new pick invalidates whatever the previous one produced, including a
    // read still in flight for it.
    resetExtraction();

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('סוג קובץ לא נתמך. יש להעלות PDF, PNG או JPEG');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('גודל הקובץ חורג מ-25MB');
      e.target.value = '';
      return;
    }

    extractionInFlight.current = runExtraction(file);
  }

  /**
   * Posts the picked file and keeps whatever comes back.
   *
   * Every failure path here is a no-op on purpose. Extraction may not make the
   * form worse: a gateway outage, a disabled client, an aborted request or a
   * network drop all leave the user exactly where they are today — filling the
   * specification fields in by hand and submitting normally. Nothing is
   * surfaced and nothing is thrown.
   */
  async function runExtraction(file: File) {
    const controller = new AbortController();
    extractionRequest.current = controller;

    const body = new FormData();
    body.set('drawing', file);
    body.set('client_id', clientId);

    try {
      const response = await fetch('/api/drawings/extract', {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      const outcome = (await response.json()) as ExtractionOutcome;

      // A file swap that landed while this was in flight owns the state now.
      if (extractionRequest.current !== controller) return;

      if (response.ok && outcome.status === 'completed') {
        extractionResult.current = outcome;
        setExtraction(outcome);
      }
    } catch {
      // Includes the abort from a file swap. Nothing to report either way.
    } finally {
      if (extractionRequest.current === controller) {
        extractionRequest.current = null;
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.set('client_id', clientId);
    formData.set('is_new_part', isNewPart ? 'true' : 'false');

    if (!isNewPart && selectedPartValue) {
      formData.set('part_id', selectedPartValue);
      // Set serial_number from existing part for validation
      const part = parts.find((p) => p.id === selectedPartValue);
      if (part) {
        formData.set('serial_number', part.serial_number);
      }
    }

    startTransition(async () => {
      // A read that is nearly done is worth a short wait — losing it would
      // cost the user every field it was about to fill. A read that is not
      // nearly done is not worth blocking on, so the wait is capped and
      // expiring it simply proceeds. The button is already in its loading
      // state throughout, so this adds no UI.
      await waitForExtraction();

      const extraction = extractionResult.current;
      if (extraction) {
        formData.set('extraction', JSON.stringify(extraction));
      }

      const result = await createRfq(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/rfq/${result.data.id}`);
    });
  }

  async function waitForExtraction() {
    const pending = extractionInFlight.current;
    if (!pending) return;

    await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(resolve, EXTRACTION_SUBMIT_GRACE_MS)),
    ]);
  }

  const partOptions = [
    ...parts.map((p) => ({
      value: p.id,
      label: p.description ? `${p.serial_number} — ${p.description}` : p.serial_number,
    })),
    { value: NEW_PART_VALUE, label: '+ חלק חדש' },
  ];

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.name }));

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
        {/* Client select + new client button */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">שם לקוח</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                options={clientOptions}
                placeholder="בחר לקוח"
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                required
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowNewClientModal(true)}
            >
              + חדש
            </Button>
          </div>
        </div>

        {/* Part select or new part inputs */}
        {clientId && (
          <div className="flex flex-col gap-1">
            {partsLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">טוען חלקים...</p>
            ) : (
              <Select
                label='מק"ט'
                options={partOptions}
                placeholder="בחר חלק"
                value={selectedPartValue}
                onChange={(e) => handlePartChange(e.target.value)}
                required
              />
            )}
          </div>
        )}

        {/* New part fields */}
        {isNewPart && (
          <>
            <Input
              label='מק"ט'
              name="serial_number"
              required
              placeholder='הזן מק"ט'
            />
            <Input
              label="תיאור"
              name="description"
              placeholder="תיאור החלק (אופציונלי)"
            />
          </>
        )}

        {/* Revision display */}
        {revision !== null && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">רוויזיה</label>
            <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
              {formatRevision(revision)}
            </div>
          </div>
        )}

        {/* Base quantity */}
        {clientId && selectedPartValue && (
          <>
            <Input
              label="כמות בסיס"
              name="base_quantity"
              type="number"
              min={1}
              required
              placeholder="הזן כמות"
            />

            {/* Drawing upload */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">שרטוט</label>
              <input
                type="file"
                name="drawing"
                accept=".pdf,.png,.jpeg,.jpg"
                onChange={handleFileChange}
                className="text-sm text-gray-700 dark:text-gray-300 file:me-3 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-900/50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/70"
              />
              {fileError && <p className="text-sm text-red-600 dark:text-red-400">{fileError}</p>}
            </div>

            {/* Notes */}
            <Textarea
              label="הערות"
              name="notes"
              placeholder="הערות נוספות (אופציונלי)"
            />
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {clientId && selectedPartValue && (
          <Button type="submit" disabled={isPending}>
            {isPending ? 'שומר...' : 'שמור טיוטה'}
          </Button>
        )}
      </form>

      {/* New client modal */}
      <Modal
        open={showNewClientModal}
        onClose={() => {
          setShowNewClientModal(false);
          setNewClientError('');
        }}
        title="לקוח חדש"
      >
        <form onSubmit={handleNewClientSubmit} className="flex flex-col gap-4">
          <Input
            label="שם לקוח"
            name="name"
            required
            placeholder="הזן שם לקוח"
          />
          {newClientError && <p className="text-sm text-red-600 dark:text-red-400">{newClientError}</p>}
          <div className="flex gap-3 justify-end mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowNewClientModal(false);
                setNewClientError('');
              }}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={newClientLoading}>
              {newClientLoading ? 'שומר...' : 'הוספה'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
