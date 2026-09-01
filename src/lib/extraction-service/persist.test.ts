import { describe, expect, it } from 'vitest';

import { silentLogger } from '@/lib/logger';
import type { DrawingFinding } from '@/lib/extraction/types';

import { persistExtraction } from './persist';
import type { CompletedExtraction } from './payload';
import type { SupabaseServerClient } from './supabase-ports';

const ACCOUNT = 'account-1';
const RFQ = 'rfq-1';

const finding = (over: Partial<DrawingFinding> = {}): DrawingFinding => ({
  label: 'MATERIAL',
  rawText: 'AMS 4027',
  confidence: 'high',
  domain: 'raw_material',
  assignmentSource: 'auto',
  ...over,
});

const extraction = (findings: DrawingFinding[]): CompletedExtraction => ({
  status: 'completed',
  fileHash: 'a'.repeat(64),
  model: 'test-model',
  findings,
});

type Insert = { table: string; rows: Record<string, unknown>[] };

/**
 * Enough of the Supabase query builder to record what would have been written.
 * `failOn` makes one table's insert fail, which is how the "the write did not
 * land" branches are reached.
 */
function fakeSupabase(failOn?: string) {
  const inserts: Insert[] = [];

  const client = {
    from(table: string) {
      return {
        insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
          const list = Array.isArray(rows) ? rows : [rows];
          const error = table === failOn ? { message: `${table} refused` } : null;
          if (!error) inserts.push({ table, rows: list });

          const result = { data: null, error };
          return {
            ...result,
            select: () => ({
              single: async () =>
                error ? result : { data: { id: 'extraction-1' }, error: null },
            }),
            then: (resolve: (r: typeof result) => unknown) => resolve(result),
          };
        },
      };
    },
  };

  return { client: client as unknown as SupabaseServerClient, inserts };
}

const rowsFor = (inserts: Insert[], table: string) =>
  inserts.filter((i) => i.table === table).flatMap((i) => i.rows);

describe('persistExtraction — pre-filling spec fields', () => {
  it('writes a domain config stamped as AI-sourced', async () => {
    const { client, inserts } = fakeSupabase();

    await persistExtraction(
      client,
      { accountId: ACCOUNT, rfqId: RFQ, extraction: extraction([finding()]) },
      silentLogger
    );

    expect(rowsFor(inserts, 'rfq_domain_configs')).toEqual([
      { rfq_id: RFQ, domain: 'raw_material', spec_value: 'AMS 4027', spec_source: 'ai' },
    ]);
  });

  it('marks the finding that filled a field as applied', async () => {
    const { client, inserts } = fakeSupabase();

    await persistExtraction(
      client,
      { accountId: ACCOUNT, rfqId: RFQ, extraction: extraction([finding()]) },
      silentLogger
    );

    expect(rowsFor(inserts, 'rfq_drawing_findings')[0]).toMatchObject({
      raw_text: 'AMS 4027',
      applied: true,
    });
  });

  it('leaves an ineligible finding unapplied and writes no config for it', async () => {
    const { client, inserts } = fakeSupabase();

    await persistExtraction(
      client,
      {
        accountId: ACCOUNT,
        rfqId: RFQ,
        extraction: extraction([finding({ confidence: 'low' })]),
      },
      silentLogger
    );

    expect(rowsFor(inserts, 'rfq_domain_configs')).toEqual([]);
    expect(rowsFor(inserts, 'rfq_drawing_findings')[0]).toMatchObject({ applied: false });
  });

  it('leaves both contenders unapplied when a domain is contested', async () => {
    const { client, inserts } = fakeSupabase();

    await persistExtraction(
      client,
      {
        accountId: ACCOUNT,
        rfqId: RFQ,
        extraction: extraction([finding({ rawText: 'AMS 4027' }), finding({ rawText: 'AMS 5659' })]),
      },
      silentLogger
    );

    expect(rowsFor(inserts, 'rfq_domain_configs')).toEqual([]);
    expect(rowsFor(inserts, 'rfq_drawing_findings').map((r) => r.applied)).toEqual([false, false]);
  });

  /**
   * `applied` has to describe what landed, not what was intended: #16 and #19
   * both read it as "this finding is already on the page".
   */
  it('does not claim a finding was applied when the config write failed', async () => {
    const { client, inserts } = fakeSupabase('rfq_domain_configs');

    await persistExtraction(
      client,
      { accountId: ACCOUNT, rfqId: RFQ, extraction: extraction([finding()]) },
      silentLogger
    );

    expect(rowsFor(inserts, 'rfq_drawing_findings')[0]).toMatchObject({ applied: false });
  });

  /**
   * Non-blocking is absolute: nothing about extraction may fail the RFQ the
   * user actually came to create.
   */
  it('never throws when the database refuses the extraction row', async () => {
    const { client } = fakeSupabase('rfq_drawing_extractions');

    await expect(
      persistExtraction(
        client,
        { accountId: ACCOUNT, rfqId: RFQ, extraction: extraction([finding()]) },
        silentLogger
      )
    ).resolves.toBeUndefined();
  });
});
