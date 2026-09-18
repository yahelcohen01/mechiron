import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { requireCaller } from '../lib/caller.js';
import { RFQ_DOMAINS, domainLabel } from '../lib/domains.js';
import {
  draftRequests,
  findDraftRfq,
  nextDraftId,
  snapshot,
} from '../lib/draft-store.js';

type SupplierRow = { id: string; name: string; email: string; domain: string };

/**
 * The riskiest tool in the app: it sends email to third parties. Irreversible,
 * external side effect, and the one place the client-confidentiality rule can
 * actually be broken. So it gets the strictest gate.
 *
 * PROTOTYPE: nothing is sent and nothing is saved. The suppliers and the client
 * name it checks against are real, which is what makes the confidentiality
 * check meaningful; the send itself is a console.log.
 */
export default defineTool({
  description:
    'Email a drafted RFQ to suppliers for one domain. Irreversible — always pauses for approval. The subject and body must never mention the client. PROTOTYPE: prints the email instead of sending it.',
  inputSchema: z.object({
    rfq_id: z.string().describe('A draft rfq id from create_rfq.'),
    domain: z.enum(RFQ_DOMAINS),
    supplier_ids: z.array(z.string()).min(1),
    email_subject: z.string().describe('Must not name the client.'),
    email_body: z.string().describe('Must not name the client.'),
  }),

  /**
   * A policy rather than always(): it can refuse outright, before a human is
   * even asked, when the call is one no approval should be able to authorize.
   * Async because the checks it makes are against the real database.
   */
  approval: async (ctx) => {
    const { toolInput } = ctx;
    if (!toolInput) return 'user-approval';

    let caller;
    try {
      caller = requireCaller(ctx);
    } catch {
      return { type: 'denied' as const, reason: 'No authenticated Mechiron user on this session.' };
    }
    const { accountId, db } = caller;

    const rfq = findDraftRfq(String(toolInput.rfq_id ?? ''), accountId);
    if (!rfq) {
      return {
        type: 'denied' as const,
        reason: 'RFQ does not belong to this account, or is not a draft from this chat.',
      };
    }

    // Cross-tenant suppliers. RLS would hide them anyway, so anything that
    // fails to come back is treated as outside the account.
    const requestedIds = (toolInput.supplier_ids ?? []) as string[];
    const { data, error } = await db
      .read('suppliers', 'id')
      .eq('account_id', accountId)
      .in('id', requestedIds);

    if (error) {
      return {
        type: 'denied' as const,
        reason: `Could not verify the suppliers, so the send is refused: ${error.message}`,
      };
    }

    const visible = new Set(((data ?? []) as unknown as { id: string }[]).map((s) => s.id));
    const outside = requestedIds.filter((id) => !visible.has(id));
    if (outside.length > 0) {
      return {
        type: 'denied' as const,
        reason: `Suppliers outside this account: ${outside.join(', ')}.`,
      };
    }

    // Client confidentiality, enforced in code rather than left to the prompt.
    const text = `${toolInput.email_subject ?? ''} ${toolInput.email_body ?? ''}`;
    if (rfq.client_name && text.includes(rfq.client_name)) {
      return {
        type: 'denied' as const,
        reason:
          'The email text names the client. Supplier-facing text must never identify the client. Rewrite it without the name.',
      };
    }

    return 'user-approval';
  },

  async execute({ rfq_id, domain, supplier_ids, email_subject, email_body }, ctx) {
    const { accountId, db } = requireCaller(ctx);

    const rfq = findDraftRfq(rfq_id, accountId);
    if (!rfq) throw new Error(`No draft RFQ ${rfq_id} in this account.`);

    const { data, error } = await db
      .read('suppliers', 'id, name, email, domain')
      .eq('account_id', accountId)
      .in('id', supplier_ids);

    if (error) throw new Error(`Could not read suppliers: ${error.message}`);

    const suppliers = (data ?? []) as unknown as SupplierRow[];
    const missing = supplier_ids.filter((id) => !suppliers.some((s) => s.id === id));
    if (missing.length > 0) {
      throw new Error(`No supplier ${missing.join(', ')} in this account.`);
    }

    // Approval is per (client, supplier) and lives in the database.
    const { data: approvals, error: approvalError } = await db
      .read('client_supplier_approvals', 'supplier_id')
      .eq('client_id', rfq.client_id);

    if (approvalError) {
      throw new Error(`Could not read supplier approvals: ${approvalError.message}`);
    }

    const approvedIds = new Set(
      ((approvals ?? []) as unknown as { supplier_id: string }[]).map((a) => a.supplier_id),
    );

    const now = new Date().toISOString();

    const sent = suppliers.map((supplier) => {
      const request = {
        id: nextDraftId('req'),
        rfq_id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        domain,
        status: 'sent' as const,
        sent_at: now,
        is_approved_supplier: approvedIds.has(supplier.id),
      };
      draftRequests.push(request);

      // PROTOTYPE: no Resend call. Print it so the run is legible in the TUI.
      console.log(
        `\n📧 [PROTOTYPE — not actually sent]\n  to: ${supplier.email} (${supplier.name})\n  approved for this client: ${request.is_approved_supplier}\n  subject: ${email_subject}\n  ---\n${email_body}\n`,
      );

      return { ...request, to: supplier.email };
    });

    rfq.status = 'in_progress';

    return {
      domain_he: domainLabel(domain),
      sent,
      unapproved_suppliers_used: sent
        .filter((s) => !s.is_approved_supplier)
        .map((s) => s.supplier_name),
      warning: 'PROTOTYPE: no email was sent and nothing was written to the database.',
      _state_after: snapshot(accountId),
    };
  },
});
