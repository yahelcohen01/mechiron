import { defineTool } from 'eve/tools';
import { always } from 'eve/tools/approval';
import { z } from 'zod';
import {
  CURRENT_ACCOUNT_ID,
  DOMAIN_LABELS_HE,
  RFQ_DOMAINS,
  nextId,
  parts,
  rfqs,
  scopedFor,
  snapshot,
} from '../lib/fake-db';

export default defineTool({
  description:
    'Create a new RFQ for a part at a new revision. Writes to the database, so it pauses for the user to approve first.',
  inputSchema: z.object({
    part_id: z.string().describe('From find_client.'),
    base_quantity: z.number().int().positive(),
    domains: z
      .array(z.enum(RFQ_DOMAINS))
      .min(1)
      .describe('Which domains need quoting.'),
    notes: z.string().nullish(),
  }),

  // The gate. The model decides to call this; a human decides whether it runs.
  // The turn parks durably at session.waiting until they answer.
  approval: always(),

  async execute({ part_id, base_quantity, domains, notes }) {
    const accountId = CURRENT_ACCOUNT_ID;

    const part = scopedFor(parts, accountId).find((p) => p.id === part_id);
    if (!part) {
      // Tenancy backstop: a part from another account is indistinguishable
      // from one that does not exist.
      throw new Error(`No part ${part_id} in this account.`);
    }

    // Revisions only ever increase.
    const revision_number = part.latest_revision + 1;
    part.latest_revision = revision_number;

    const rfq = {
      id: nextId('rfq'),
      account_id: accountId,
      part_id,
      revision_number,
      base_quantity,
      notes: notes ?? null,
      status: 'draft' as const,
      domains,
      created_at: new Date().toISOString(),
    };
    rfqs.push(rfq);

    return {
      rfq,
      part_serial: part.serial_number,
      domains_he: domains.map((d) => DOMAIN_LABELS_HE[d]),
      _state_after: snapshot(),
    };
  },
});
