import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { requireCaller } from '../lib/caller.js';

type ClientRow = {
  id: string;
  name: string;
  contact_name: string | null;
  parts: { id: string; serial_number: string; description: string | null }[];
};

type ApprovalRow = { client_id: string; supplier_id: string };

export default defineTool({
  description:
    'Find clients by (partial) Hebrew or English name. Returns the client, its parts, and which suppliers it has approved. Call this before anything that needs a client_id or part_id. Read-only.',
  inputSchema: z.object({
    query: z
      .string()
      .describe('Partial client name. Empty string returns every client.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Cap on clients returned.'),
  }),

  async execute({ query, limit }, ctx) {
    // Tenancy comes from verified route auth, never from the model. Every query
    // below also runs under this user's RLS, so the filters are defence in depth
    // rather than the boundary itself.
    const { accountId, db } = requireCaller(ctx);

    const q = query.trim();

    let clientQuery = db
      .read('clients', 'id, name, contact_name, parts(id, serial_number, description)')
      .eq('account_id', accountId)
      .order('name')
      .limit(limit);

    // ilike with escaped wildcards: a client literally named "100%" should not
    // turn into a match-everything pattern.
    if (q !== '') {
      const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
      clientQuery = clientQuery.ilike('name', `%${escaped}%`);
    }

    const { data, error } = await clientQuery;
    if (error) throw new Error(`Could not read clients: ${error.message}`);

    const clients = (data ?? []) as unknown as ClientRow[];
    if (clients.length === 0) {
      return { matches: [], note: q === '' ? 'This account has no clients.' : `No client matches "${q}".` };
    }

    // Approvals are a join table with no account_id of its own; it inherits
    // tenancy through clients.id, so scoping by these client ids is the filter.
    const clientIds = clients.map((c) => c.id);
    const { data: approvalData, error: approvalError } = await db
      .read('client_supplier_approvals', 'client_id, supplier_id')
      .in('client_id', clientIds);

    if (approvalError) {
      throw new Error(`Could not read supplier approvals: ${approvalError.message}`);
    }

    const approvalsByClient = new Map<string, string[]>();
    for (const row of (approvalData ?? []) as unknown as ApprovalRow[]) {
      const list = approvalsByClient.get(row.client_id) ?? [];
      list.push(row.supplier_id);
      approvalsByClient.set(row.client_id, list);
    }

    return {
      matches: clients.map((c) => ({
        id: c.id,
        name: c.name,
        contact_name: c.contact_name,
        parts: (c.parts ?? []).map((p) => ({
          id: p.id,
          serial_number: p.serial_number,
          description: p.description,
        })),
        approved_supplier_ids: approvalsByClient.get(c.id) ?? [],
      })),
    };
  },
});
