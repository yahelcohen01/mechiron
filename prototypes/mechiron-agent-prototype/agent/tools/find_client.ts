import { defineTool } from 'eve/tools';
import { z } from 'zod';
import {
  CURRENT_ACCOUNT_ID,
  clients,
  clientSupplierApprovals,
  parts,
  scopedFor,
} from '../lib/fake-db';

export default defineTool({
  description:
    'Find clients by (partial) Hebrew or English name. Returns the client, its parts, and which suppliers it has approved. Call this before anything that needs a client_id.',
  inputSchema: z.object({
    query: z
      .string()
      .describe('Partial client name. Empty string returns every client.'),
  }),
  async execute({ query }) {
    // In the real app: const accountId = await getAccountId() from the Supabase
    // session. Here CURRENT_ACCOUNT_ID stands in. The point is that the tool
    // resolves the tenant itself and never accepts one from the model.
    const accountId = CURRENT_ACCOUNT_ID;

    const q = query.trim().toLowerCase();
    const matches = scopedFor(clients, accountId).filter((c) =>
      q === '' ? true : c.name.toLowerCase().includes(q),
    );

    return {
      matches: matches.map((c) => ({
        id: c.id,
        name: c.name,
        contact_name: c.contact_name,
        parts: scopedFor(parts, accountId)
          .filter((p) => p.client_id === c.id)
          .map((p) => ({
            id: p.id,
            serial_number: p.serial_number,
            description: p.description,
            latest_revision: p.latest_revision,
          })),
        approved_supplier_ids: clientSupplierApprovals[c.id] ?? [],
      })),
    };
  },
});
