/**
 * PROTOTYPE — in-memory store for everything the agent *writes*. Wipe me.
 *
 * Replaces the old fake-db.ts, and the split is the point: reads now come from
 * the real Supabase database (read-only, RLS-scoped — see supabase.ts), while
 * writes land here and die with the process. So the demo talks about your real
 * clients, parts and suppliers, but cannot create a row, send an email, or
 * touch production data if the model goes sideways.
 *
 * Everything here is keyed by account_id anyway, so a draft made under one
 * tenant never surfaces under another even though this store is process-global.
 */

import type { RfqDomain } from './domains.js';

export type DraftRfq = {
  id: string;
  account_id: string;
  /** Real `parts.id` from the database. */
  part_id: string;
  part_serial: string;
  client_id: string;
  client_name: string;
  /** Computed as (highest real revision) + 1. Never written back to Postgres. */
  revision_number: number;
  base_quantity: number;
  notes: string | null;
  status: 'draft' | 'in_progress';
  domains: RfqDomain[];
  created_at: string;
};

export type DraftRequest = {
  id: string;
  rfq_id: string;
  /** Real `suppliers.id` from the database. */
  supplier_id: string;
  supplier_name: string;
  domain: RfqDomain;
  status: 'sent';
  sent_at: string;
  is_approved_supplier: boolean;
};

export const draftRfqs: DraftRfq[] = [];
export const draftRequests: DraftRequest[] = [];

let seq = 100;
/** Prefixed so a draft id is never mistaken for a real UUID in a transcript. */
export const nextDraftId = (prefix: string) => `draft_${prefix}_${++seq}`;

export function findDraftRfq(id: string, accountId: string): DraftRfq | undefined {
  return draftRfqs.find((r) => r.id === id && r.account_id === accountId);
}

/** Dump what the agent has created this session, for the "surface the state" rule. */
export function snapshot(accountId: string) {
  const mine = draftRfqs.filter((r) => r.account_id === accountId);
  const mineIds = new Set(mine.map((r) => r.id));
  const requests = draftRequests.filter((q) => mineIds.has(q.rfq_id));

  return {
    note: 'In-memory prototype drafts only. Nothing here is in the database.',
    draft_rfqs: mine.length,
    draft_requests: requests.length,
    draft_rfq_ids: mine.map((r) => r.id),
  };
}
