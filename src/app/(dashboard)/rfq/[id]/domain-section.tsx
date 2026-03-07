'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DOMAIN_LABELS_HE, SPEC_LABELS_HE } from '@/lib/types';
import { SupplierRow } from './supplier-row';
import { AddSupplierModal } from './add-supplier-modal';
import {
  saveDomainConfig,
  addSupplierToRfq,
  removeSupplierFromRfq,
  createInlineSupplier,
  sendDomainEmails,
  getSpecSuggestions,
  type DomainSectionData,
} from './actions';

type DomainSectionProps = {
  rfqId: string;
  baseQuantity: number;
  data: DomainSectionData;
};

export function DomainSection({ rfqId, baseQuantity, data }: DomainSectionProps) {
  const router = useRouter();
  const { domain, config, approved_suppliers, available_non_approved } = data;

  const [isOpen, setIsOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Config form state
  const [quantityOverride, setQuantityOverride] = useState(
    config.quantity_override?.toString() ?? ''
  );
  const [emailSubject, setEmailSubject] = useState(config.email_subject);
  const [emailBodyText, setEmailBodyText] = useState(config.email_body_text);
  const [specValue, setSpecValue] = useState(config.spec_value ?? '');

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const specInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  const [isSaving, startSaving] = useTransition();
  const [isSending, startSending] = useTransition();
  const [configSaved, setConfigSaved] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: string[] } | null>(null);
  const [error, setError] = useState('');

  const pendingCount = approved_suppliers.filter(
    (s) => s.rfq_request_id && s.rfq_request_status === 'pending'
  ).length;
  const sentCount = approved_suppliers.filter(
    (s) => s.rfq_request_status === 'sent'
  ).length;
  const totalAdded = approved_suppliers.filter((s) => s.rfq_request_id).length;

  const effectiveQuantity = quantityOverride ? parseInt(quantityOverride, 10) : baseQuantity;
  const canSend = pendingCount > 0 && specValue.trim().length > 0;

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        specInputRef.current &&
        !specInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const result = await getSpecSuggestions(domain, query);
    if (result.success && result.data.length > 0) {
      setSuggestions(result.data);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [domain]);

  function handleSpecChange(value: string) {
    setSpecValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function handleSelectSuggestion(value: string) {
    setSpecValue(value);
    setShowSuggestions(false);
  }

  function handleSaveConfig() {
    setError('');
    setConfigSaved(false);
    startSaving(async () => {
      const result = await saveDomainConfig(rfqId, domain, {
        quantity_override: quantityOverride ? parseInt(quantityOverride, 10) : null,
        email_subject: emailSubject,
        email_body_text: emailBodyText,
        spec_value: specValue.trim() || null,
      });
      if (result.success) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 2000);
        toast.success('הגדרות נשמרו');
      } else {
        setError(result.error);
        toast.error('שגיאה בשמירת הגדרות');
      }
    });
  }

  function handleSend() {
    setError('');
    setSendResult(null);
    // Auto-save config before sending
    startSending(async () => {
      await saveDomainConfig(rfqId, domain, {
        quantity_override: quantityOverride ? parseInt(quantityOverride, 10) : null,
        email_subject: emailSubject,
        email_body_text: emailBodyText,
        spec_value: specValue.trim() || null,
      });
      const result = await sendDomainEmails(rfqId, domain);
      if (result.success) {
        setSendResult(result.data);
        toast.success(`נשלחו ${result.data.sent} אימיילים בהצלחה`);
        if (result.data.failed.length > 0) {
          toast.error(`שליחה נכשלה ל: ${result.data.failed.join(', ')}`);
        }
        router.refresh();
      } else {
        setError(result.error);
        toast.error('שגיאה בשליחת אימיילים');
      }
    });
  }

  async function handleAddApprovedSupplier(supplierId: string) {
    const result = await addSupplierToRfq(rfqId, supplierId, domain, true);
    if (!result.success) throw new Error(result.error);
    router.refresh();
  }

  async function handleRemoveSupplier(requestId: string) {
    await removeSupplierFromRfq(requestId, rfqId);
    router.refresh();
  }

  async function handleAddNonApproved(supplierId: string) {
    const result = await addSupplierToRfq(rfqId, supplierId, domain, false);
    if (!result.success) throw new Error(result.error);
    router.refresh();
  }

  async function handleCreateNew(formData: FormData) {
    const result = await createInlineSupplier(formData, rfqId, domain, false);
    if (!result.success) throw new Error(result.error);
    router.refresh();
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">
            {DOMAIN_LABELS_HE[domain]}
          </span>
          {specValue && (
            <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
              {specValue}
            </span>
          )}
          {totalAdded > 0 && (
            <span className="text-xs text-gray-500">
              {sentCount}/{totalAdded} נשלחו
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="p-4 flex flex-col gap-5">
          {/* Config fields */}
          <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700">הגדרות תחום</h4>

            {/* Spec value with autocomplete */}
            <div className="relative">
              <Input
                ref={specInputRef}
                label={SPEC_LABELS_HE[domain]}
                value={specValue}
                onChange={(e) => handleSpecChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder={`הזן ${SPEC_LABELS_HE[domain]}`}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="w-full text-start px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                      onClick={() => handleSelectSuggestion(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="כמות (דריסה)"
              type="number"
              min={1}
              value={quantityOverride}
              onChange={(e) => setQuantityOverride(e.target.value)}
              placeholder={`בסיס: ${baseQuantity}`}
            />
            <Input
              label="נושא אימייל"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
            <div>
              <Textarea
                label="טקסט באימייל"
                value={emailBodyText}
                onChange={(e) => setEmailBodyText(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-gray-400 mt-1">
                {'תגיות זמינות: {כמות}, {תחום}, {ערך}, {מקט}, {רוויזיה}'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleSaveConfig}
                disabled={isSaving}
              >
                {isSaving ? 'שומר...' : 'שמור הגדרות'}
              </Button>
              {configSaved && <span className="text-sm text-green-600">נשמר</span>}
            </div>
          </div>

          {/* Supplier list */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium text-gray-700">ספקים</h4>
            {approved_suppliers.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">אין ספקים בתחום זה</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {approved_suppliers.map((item) => (
                  <SupplierRow
                    key={item.supplier.id}
                    item={item}
                    onAdd={() => handleAddApprovedSupplier(item.supplier.id)}
                    onRemove={() => {
                      if (item.rfq_request_id) {
                        handleRemoveSupplier(item.rfq_request_id);
                      }
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setShowAddModal(true)}
              >
                + הוספת ספק
              </Button>
            </div>
          </div>

          {/* Send button */}
          {pendingCount > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
              {!specValue.trim() && (
                <p className="text-xs text-amber-600">
                  יש למלא את שדה &quot;{SPEC_LABELS_HE[domain]}&quot; לפני שליחה
                </p>
              )}
              <Button
                type="button"
                onClick={handleSend}
                disabled={isSending || !canSend}
              >
                {isSending
                  ? 'שולח...'
                  : `שלח ל-${pendingCount} ספקים (כמות: ${effectiveQuantity})`}
              </Button>
            </div>
          )}

          {/* Results / Errors */}
          {sendResult && (
            <div className="text-sm">
              <p className="text-green-600">נשלחו {sendResult.sent} אימיילים בהצלחה</p>
              {sendResult.failed.length > 0 && (
                <p className="text-red-600">
                  שליחה נכשלה ל: {sendResult.failed.join(', ')}
                </p>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* Add supplier modal */}
      <AddSupplierModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        domain={domain}
        availableSuppliers={available_non_approved}
        onSelectExisting={handleAddNonApproved}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
}
