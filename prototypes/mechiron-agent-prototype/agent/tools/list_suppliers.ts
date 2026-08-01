import { defineTool } from 'eve/tools';
import { z } from 'zod';
import {
  CURRENT_ACCOUNT_ID,
  DOMAIN_LABELS_HE,
  RFQ_DOMAINS,
  isApprovedSupplier,
  scopedFor,
  suppliers,
} from '../lib/fake-db';

export default defineTool({
  description:
    'List suppliers, optionally filtered by domain. When client_id is given, each supplier is marked as approved or not approved for that client.',
  inputSchema: z.object({
    domain: z.enum(RFQ_DOMAINS).optional().describe('Filter to one domain.'),
    client_id: z
      .string()
      .optional()
      .describe('Mark approval status relative to this client.'),
  }),
  async execute({ domain, client_id }) {
    const accountId = CURRENT_ACCOUNT_ID;

    const rows = scopedFor(suppliers, accountId).filter((s) =>
      domain ? s.domain === domain : true,
    );

    return {
      suppliers: rows.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        domain: s.domain,
        domain_he: DOMAIN_LABELS_HE[s.domain],
        is_approved_for_client: client_id
          ? isApprovedSupplier(client_id, s.id)
          : null,
      })),
    };
  },
});
