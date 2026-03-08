'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatRevision } from '@/lib/types';
import {
  getPartsForClient,
  getNextRevision,
  createInlineClient,
  createRfq,
} from './actions';

type ClientOption = { id: string; name: string };
type PartOption = { id: string; serial_number: string; description: string | null };

const NEW_PART_VALUE = '__new__';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

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

  // Form
  const [error, setError] = useState('');

  async function handleClientChange(newClientId: string) {
    setClientId(newClientId);
    setSelectedPartValue('');
    setRevision(null);
    setParts([]);

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
      const result = await createRfq(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/rfq/${result.data.id}`);
    });
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
