import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { requireCaller } from '../lib/caller.js';
import { domainLabel } from '../lib/domains.js';
import { draftRequests, draftRfqs, snapshot } from '../lib/draft-store.js';

/**
 * Shape of the embedded select below. PostgREST returns each embedded
 * to-one relationship as an object and each to-many as an array.
 */
type RfqRow = {
  id: string;
  base_quantity: number;
  notes: string | null;
  status: string;
  created_at: string;
  part_revisions: {
    revision_number: number;
    parts: { serial_number: string; clients: { name: string } | null } | null;
  } | null;
  rfq_domain_configs: { domain: string }[];
  rfq_requests: {
    domain: string;
    status: string;
    sent_at: string | null;
    is_approved_supplier: boolean;
    suppliers: { name: string } | null;
  }[];
};

export default defineTool({
  description:
    'Show RFQs in this account with their part, client, domains, and which supplier requests have gone out. Covers both real RFQs from the database and drafts created in this chat. Read-only.',
  inputSchema: z.object({
    rfq_id: z.string().optional().describe('Omit to list recent RFQs.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe('Cap on real RFQs returned, newest first.'),
  }),

  async execute({ rfq_id, limit }, ctx) {
    const { accountId, db } = requireCaller(ctx);

    // A draft id never reaches the database — it is not a UUID, and asking
    // Postgres for one would just raise a type error.
    const draftMatches = draftRfqs.filter(
      (r) => r.account_id === accountId && (rfq_id ? r.id === rfq_id : true),
    );

    const drafts = draftMatches.map((r) => ({
      id: r.id,
      source: 'draft (in memory, not saved)' as const,
      status: r.status,
      part: r.part_serial,
      revision: r.revision_number,
      client: r.client_name,
      base_quantity: r.base_quantity,
      notes: r.notes,
      domains_he: r.domains.map(domainLabel),
      requests: draftRequests
        .filter((q) => q.rfq_id === r.id)
        .map((q) => ({
          supplier: q.supplier_name,
          domain_he: domainLabel(q.domain),
          status: q.status,
          is_approved_supplier: q.is_approved_supplier,
        })),
    }));

    // Asked for a specific draft — no point querying Postgres for it.
    if (rfq_id && drafts.length > 0) {
      return { rfqs: drafts, _state_after: snapshot(accountId) };
    }

    let rfqQuery = db
      .read(
        'rfqs',
        'id, base_quantity, notes, status, created_at, ' +
          'part_revisions(revision_number, parts(serial_number, clients(name))), ' +
          'rfq_domain_configs(domain), ' +
          'rfq_requests(domain, status, sent_at, is_approved_supplier, suppliers(name))',
      )
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (rfq_id) rfqQuery = rfqQuery.eq('id', rfq_id);

    const { data, error } = await rfqQuery;

    if (error) {
      // A malformed id is a normal outcome when the model guesses, so report it
      // as "not found" rather than letting a Postgres type error surface.
      if (rfq_id && /invalid input syntax|uuid/i.test(error.message)) {
        return {
          rfqs: drafts,
          note: `No RFQ ${rfq_id} in this account.`,
          _state_after: snapshot(accountId),
        };
      }
      throw new Error(`Could not read RFQs: ${error.message}`);
    }

    const real = ((data ?? []) as unknown as RfqRow[]).map((r) => ({
      id: r.id,
      source: 'database' as const,
      status: r.status,
      part: r.part_revisions?.parts?.serial_number ?? null,
      revision: r.part_revisions?.revision_number ?? null,
      client: r.part_revisions?.parts?.clients?.name ?? null,
      base_quantity: r.base_quantity,
      notes: r.notes,
      created_at: r.created_at,
      domains_he: (r.rfq_domain_configs ?? []).map((d) => domainLabel(d.domain)),
      requests: (r.rfq_requests ?? []).map((q) => ({
        supplier: q.suppliers?.name ?? null,
        domain_he: domainLabel(q.domain),
        status: q.status,
        sent_at: q.sent_at,
        is_approved_supplier: q.is_approved_supplier,
      })),
    }));

    const rfqs = [...drafts, ...real];

    return {
      rfqs,
      ...(rfqs.length === 0
        ? { note: rfq_id ? `No RFQ ${rfq_id} in this account.` : 'No RFQs yet.' }
        : {}),
      _state_after: snapshot(accountId),
    };
  },
});
