import { defineTool } from 'eve/tools';
import { z } from 'zod';
import {
  CURRENT_ACCOUNT_ID,
  DOMAIN_LABELS_HE,
  clients,
  parts,
  rfqRequests,
  rfqs,
  scopedFor,
  suppliers,
} from '../lib/fake-db';

export default defineTool({
  description:
    'Show every RFQ in this account with its part, client, domains, and which supplier requests have gone out. Read-only.',
  inputSchema: z.object({
    rfq_id: z.string().optional().describe('Omit to list all RFQs.'),
  }),
  async execute({ rfq_id }) {
    const accountId = CURRENT_ACCOUNT_ID;

    const rows = scopedFor(rfqs, accountId).filter((r) =>
      rfq_id ? r.id === rfq_id : true,
    );

    return {
      rfqs: rows.map((r) => {
        const part = parts.find((p) => p.id === r.part_id);
        const client = clients.find((c) => c.id === part?.client_id);
        return {
          id: r.id,
          status: r.status,
          part: part?.serial_number,
          revision: r.revision_number,
          client: client?.name,
          base_quantity: r.base_quantity,
          domains_he: r.domains.map((d) => DOMAIN_LABELS_HE[d]),
          requests: rfqRequests
            .filter((q) => q.rfq_id === r.id)
            .map((q) => ({
              supplier: suppliers.find((s) => s.id === q.supplier_id)?.name,
              domain_he: DOMAIN_LABELS_HE[q.domain],
              status: q.status,
              is_approved_supplier: q.is_approved_supplier,
            })),
        };
      }),
    };
  },
});
