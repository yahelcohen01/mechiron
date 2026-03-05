'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { RFQ_DOMAINS, DOMAIN_LABELS_HE, type Supplier, type RfqDomain } from '@/lib/types';
import { deleteSupplier } from './actions';
import { SupplierForm } from './supplier-form';

type SuppliersTableProps = {
  suppliers: Supplier[];
};

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [domainFilter, setDomainFilter] = useState<RfqDomain | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const filtered =
    domainFilter === 'all'
      ? suppliers
      : suppliers.filter((s) => s.domain === domainFilter);

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingSupplier(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);

    const result = await deleteSupplier(deleteTarget.id);

    setDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setDeleteTarget(null);
  }

  return (
    <div>
      {/* Domain filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setDomainFilter('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            domainFilter === 'all'
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          הכל ({suppliers.length})
        </button>
        {RFQ_DOMAINS.map((domain) => {
          const count = suppliers.filter((s) => s.domain === domain).length;
          return (
            <button
              key={domain}
              onClick={() => setDomainFilter(domain)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                domainFilter === domain
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {DOMAIN_LABELS_HE[domain]} ({count})
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setFormOpen(true)}>+ ספק חדש</Button>
      </div>

      {/* Table */}
      <DataTable
        headers={['שם', 'תחום', 'איש קשר', 'אימייל', 'טלפון', 'פעולות']}
        isEmpty={filtered.length === 0}
        emptyState={
          <EmptyState
            title="אין ספקים"
            description={domainFilter === 'all' ? 'הוסף ספק ראשון כדי להתחיל' : 'אין ספקים בתחום זה'}
            action={<Button onClick={() => setFormOpen(true)}>+ ספק חדש</Button>}
          />
        }
      >
        {filtered.map((supplier) => (
          <tr key={supplier.id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
            <td className="px-4 py-3">
              <Badge>{DOMAIN_LABELS_HE[supplier.domain]}</Badge>
            </td>
            <td className="px-4 py-3 text-gray-600">{supplier.contact_name ?? '—'}</td>
            <td className="px-4 py-3 text-gray-600" dir="ltr">{supplier.email}</td>
            <td className="px-4 py-3 text-gray-600" dir="ltr">{supplier.phone ?? '—'}</td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(supplier)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  עריכה
                </button>
                <button
                  onClick={() => setDeleteTarget(supplier)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  מחיקה
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {/* Form modal */}
      <SupplierForm
        open={formOpen}
        onClose={closeForm}
        supplier={editingSupplier}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        title="מחיקת ספק"
      >
        <p className="text-sm text-gray-600 mb-4">
          האם למחוק את הספק <strong>{deleteTarget?.name}</strong>?
        </p>
        {deleteError && <p className="text-sm text-red-600 mb-4">{deleteError}</p>}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'מוחק...' : 'מחיקה'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
