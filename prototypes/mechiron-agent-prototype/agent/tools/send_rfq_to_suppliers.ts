import { defineTool } from 'eve/tools';
import { z } from 'zod';
import {
  CURRENT_ACCOUNT_ID,
  DOMAIN_LABELS_HE,
  RFQ_DOMAINS,
  clients,
  isApprovedSupplier,
  nextId,
  parts,
  rfqRequests,
  rfqs,
  scopedFor,
  snapshot,
  suppliers,
} from '../lib/fake-db';

/**
 * The riskiest tool in the app: it sends email to third parties. Irreversible,
 * external side effect, and the one place the client-confidentiality rule can
 * actually be broken. So it gets the strictest gate.
 */
export default defineTool({
  description:
    'Email an RFQ to suppliers for one domain. Irreversible — always pauses for approval. The subject and body must never mention the client.',
  inputSchema: z.object({
    rfq_id: z.string(),
    domain: z.enum(RFQ_DOMAINS),
    supplier_ids: z.array(z.string()).min(1),
    email_subject: z.string().describe('Must not name the client.'),
    email_body: z.string().describe('Must not name the client.'),
  }),

  // A policy rather than always(): it can refuse outright, before a human is
  // even asked, when the call is one no approval should be able to authorize.
  approval: ({ toolInput }) => {
    const rfq = rfqs.find((r) => r.id === toolInput?.rfq_id);
    if (!rfq || rfq.account_id !== CURRENT_ACCOUNT_ID) {
      return { type: 'denied', reason: 'RFQ does not belong to this account.' };
    }

    const crossTenant = (toolInput?.supplier_ids ?? []).filter((id: string) => {
      const s = suppliers.find((x) => x.id === id);
      return !s || s.account_id !== CURRENT_ACCOUNT_ID;
    });
    if (crossTenant.length > 0) {
      return {
        type: 'denied',
        reason: `Suppliers outside this account: ${crossTenant.join(', ')}.`,
      };
    }

    // Client confidentiality, enforced in code rather than left to the prompt.
    const part = parts.find((p) => p.id === rfq.part_id);
    const client = clients.find((c) => c.id === part?.client_id);
    if (client) {
      const text = `${toolInput?.email_subject ?? ''} ${toolInput?.email_body ?? ''}`;
      if (text.includes(client.name)) {
        return {
          type: 'denied',
          reason:
            'The email text names the client. Supplier-facing text must never identify the client. Rewrite it without the name.',
        };
      }
    }

    return 'user-approval';
  },

  async execute({ rfq_id, domain, supplier_ids, email_subject, email_body }) {
    const accountId = CURRENT_ACCOUNT_ID;

    const rfq = scopedFor(rfqs, accountId).find((r) => r.id === rfq_id);
    if (!rfq) throw new Error(`No RFQ ${rfq_id} in this account.`);

    const part = scopedFor(parts, accountId).find((p) => p.id === rfq.part_id)!;
    const now = new Date().toISOString();

    const sent = supplier_ids.map((supplier_id) => {
      const supplier = scopedFor(suppliers, accountId).find(
        (s) => s.id === supplier_id,
      );
      if (!supplier) throw new Error(`No supplier ${supplier_id} in this account.`);

      const request = {
        id: nextId('req'),
        rfq_id,
        supplier_id,
        domain,
        status: 'sent' as const,
        sent_at: now,
        is_approved_supplier: isApprovedSupplier(part.client_id, supplier_id),
      };
      rfqRequests.push(request);

      // PROTOTYPE: no Resend call. Print it so the run is legible in the TUI.
      console.log(
        `\n📧 [PROTOTYPE — not actually sent]\n  to: ${supplier.email} (${supplier.name})\n  approved for this client: ${request.is_approved_supplier}\n  subject: ${email_subject}\n  ---\n${email_body}\n`,
      );

      return { ...request, supplier_name: supplier.name, to: supplier.email };
    });

    rfq.status = 'in_progress';

    return {
      domain_he: DOMAIN_LABELS_HE[domain],
      sent,
      unapproved_suppliers_used: sent
        .filter((s) => !s.is_approved_supplier)
        .map((s) => s.supplier_name),
      _state_after: snapshot(),
    };
  },
});
