import { defineTool } from 'eve/tools';
import { always } from 'eve/tools/approval';
import { z } from 'zod';
import { requireCaller } from '../lib/caller.js';
import { RFQ_DOMAINS, domainLabel } from '../lib/domains.js';
import { draftRfqs, nextDraftId, snapshot } from '../lib/draft-store.js';

type PartRow = {
  id: string;
  serial_number: string;
  client_id: string;
  clients: { name: string } | null;
  part_revisions: { revision_number: number }[];
};

/**
 * PROTOTYPE — reads real, writes fake.
 *
 * The part, its client and its revision history all come from the database;
 * the RFQ this produces goes into the in-memory draft store and is never
 * persisted. That keeps the approval gate demonstrable against your real
 * catalogue without the agent being able to create a production row.
 *
 * To make this write for real you would add an `rfqs` + `part_revisions` insert
 * here — and at that point the read-only client in lib/supabase.ts would have to
 * be widened deliberately, which is the point of it being narrow.
 */
export default defineTool({
  description:
    'Draft a new RFQ for a part at the next revision. Pauses for the user to approve first. PROTOTYPE: the draft is held in memory and is not saved to the database.',
  inputSchema: z.object({
    part_id: z.string().describe('A part id from find_client.'),
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

  async execute({ part_id, base_quantity, domains, notes }, ctx) {
    const { accountId, db } = requireCaller(ctx);

    const { data, error } = await db
      .read(
        'parts',
        'id, serial_number, client_id, clients(name), part_revisions(revision_number)',
      )
      .eq('account_id', accountId)
      .eq('id', part_id)
      .maybeSingle();

    if (error && !/invalid input syntax|uuid/i.test(error.message)) {
      throw new Error(`Could not read part: ${error.message}`);
    }

    const part = data as unknown as PartRow | null;
    if (!part) {
      // Tenancy backstop: a part from another account is indistinguishable
      // from one that does not exist. RLS already hid it; this is the message.
      throw new Error(`No part ${part_id} in this account.`);
    }

    // Revisions only ever increase. Max of what the database already has, so a
    // draft never claims a revision number that is already taken.
    const highest = (part.part_revisions ?? []).reduce(
      (max, r) => Math.max(max, r.revision_number),
      -1,
    );
    const revision_number = highest + 1;

    const rfq = {
      id: nextDraftId('rfq'),
      account_id: accountId,
      part_id: part.id,
      part_serial: part.serial_number,
      client_id: part.client_id,
      client_name: part.clients?.name ?? 'לקוח לא ידוע',
      revision_number,
      base_quantity,
      notes: notes ?? null,
      status: 'draft' as const,
      domains: [...domains],
      created_at: new Date().toISOString(),
    };
    draftRfqs.push(rfq);

    return {
      rfq,
      part_serial: part.serial_number,
      domains_he: domains.map(domainLabel),
      warning:
        'PROTOTYPE: this RFQ exists only in memory for this demo. It was not written to the database.',
      _state_after: snapshot(accountId),
    };
  },
});
