"use client";

import { Fragment, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import type { Client } from "@/lib/types";
import { deleteClient } from "./actions";
import { ClientForm } from "./client-form";
import { ClientApprovals } from "./client-approvals";

type ClientsTableProps = {
  clients: Client[];
};

export function ClientsTable({ clients }: ClientsTableProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function openEdit(client: Client) {
    setEditingClient(client);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingClient(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);

    const result = await deleteClient(deleteTarget.id);

    setDeleting(false);

    if (!result.success) {
      setDeleteError(result.error);
      return;
    }

    setDeleteTarget(null);
  }

  function toggleExpand(clientId: string) {
    setExpandedId(expandedId === clientId ? null : clientId);
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setFormOpen(true)}>+ לקוח חדש</Button>
      </div>

      <DataTable
        headers={["שם", "איש קשר", "אימייל", "טלפון", "פעולות"]}
        isEmpty={clients.length === 0}
        emptyState={
          <EmptyState
            title="אין לקוחות"
            description="הוסף לקוח ראשון כדי להתחיל"
            action={
              <Button onClick={() => setFormOpen(true)}>+ לקוח חדש</Button>
            }
          />
        }
      >
        {clients.map((client) => (
          <Fragment key={client.id}>
            <tr
              key={client.id}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleExpand(client.id)}
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                <span className="me-2 text-gray-400">
                  {expandedId === client.id ? "▾" : "▸"}
                </span>
                {client.name}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {client.contact_name ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-600" dir="ltr">
                {client.contact_email ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-600" dir="ltr">
                {client.contact_phone ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div
                  className="flex gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => openEdit(client)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => setDeleteTarget(client)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    מחיקה
                  </button>
                </div>
              </td>
            </tr>
            {expandedId === client.id && (
              <tr key={`${client.id}-approvals`}>
                <td colSpan={5} className="px-8 py-4 bg-gray-50/50">
                  <ClientApprovals clientId={client.id} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </DataTable>

      <ClientForm open={formOpen} onClose={closeForm} client={editingClient} />

      <Modal
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        title="מחיקת לקוח"
      >
        <p className="text-sm text-gray-600 mb-4">
          האם למחוק את הלקוח <strong>{deleteTarget?.name}</strong>?
        </p>
        {deleteError && (
          <p className="text-sm text-red-600 mb-4">{deleteError}</p>
        )}
        <div className="flex gap-3 justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setDeleteTarget(null);
              setDeleteError("");
            }}
          >
            ביטול
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? "מוחק..." : "מחיקה"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
