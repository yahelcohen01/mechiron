import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { requireCaller } from '../lib/caller.js';
import { RFQ_DOMAINS, domainLabel } from '../lib/domains.js';

type SupplierRow = {
  id: string;
  name: string;
  email: string;
  contact_name: string | null;
  domain: string;
};

export default defineTool({
  description:
    'List suppliers, optionally filtered by domain. When client_id is given, each supplier is marked as approved or not approved for that client. Read-only.',
  inputSchema: z.object({
    domain: z.enum(RFQ_DOMAINS).optional().describe('Filter to one domain.'),
    client_id: z
      .string()
      .optional()
      .describe('A client id from find_client. Marks approval status relative to that client.'),
  }),

  async execute({ domain, client_id }, ctx) {
    const { accountId, db } = requireCaller(ctx);

    let supplierQuery = db
      .read('suppliers', 'id, name, email, contact_name, domain')
      .eq('account_id', accountId)
      .order('name');

    if (domain) supplierQuery = supplierQuery.eq('domain', domain);

    const { data, error } = await supplierQuery;
    if (error) throw new Error(`Could not read suppliers: ${error.message}`);

    const suppliers = (data ?? []) as unknown as SupplierRow[];

    // Only look up approvals when asked. Note the client_id is verified against
    // this account first: an id the caller cannot see must not be usable to
    // probe which suppliers some other tenant has approved.
    let approvedIds: Set<string> | null = null;
    if (client_id) {
      const { data: clientRow, error: clientError } = await db
        .read('clients', 'id')
        .eq('account_id', accountId)
        .eq('id', client_id)
        .maybeSingle();

      if (clientError) {
        throw new Error(`Could not verify client: ${clientError.message}`);
      }
      if (!clientRow) {
        throw new Error(`No client ${client_id} in this account.`);
      }

      const { data: approvals, error: approvalError } = await db
        .read('client_supplier_approvals', 'supplier_id')
        .eq('client_id', client_id);

      if (approvalError) {
        throw new Error(`Could not read supplier approvals: ${approvalError.message}`);
      }

      approvedIds = new Set(
        ((approvals ?? []) as unknown as { supplier_id: string }[]).map((a) => a.supplier_id),
      );
    }

    return {
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        contact_name: s.contact_name,
        domain: s.domain,
        domain_he: domainLabel(s.domain),
        is_approved_for_client: approvedIds ? approvedIds.has(s.id) : null,
      })),
    };
  },
});
