import type { createClient } from '@/lib/supabase/server';
import type { Logger } from '@/lib/logger';
import type { DrawingFinding } from '@/lib/extraction/types';

import type { CompletedExtraction } from './payload';
import type { ExtractionPorts } from './service';

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The real implementations of the service's ports.
 *
 * Every one of them **fails closed**: if a query errors for any reason — the
 * table was rolled back, RLS refused it, the column does not exist, the
 * network blipped — the answer is the conservative one. For the two kill
 * switches that means "disabled", so an unverifiable permission never results
 * in a drawing being transmitted. For the cache it means "no hit", which costs
 * one model call and can never return the wrong account's findings.
 */
export function createSupabasePorts(
  supabase: SupabaseServerClient,
  accountId: string,
  log: Logger
): ExtractionPorts {
  return {
    async isClientExtractionEnabled(clientId) {
      const { data, error } = await supabase
        .from('clients')
        .select('ai_extraction_enabled')
        .eq('id', clientId)
        .eq('account_id', accountId)
        .maybeSingle();

      if (error) {
        // Includes the case where 009 was rolled back and the column is gone.
        log.warn('client.switch.unreadable', { error: error.message });
        return false;
      }

      if (!data) {
        // No such client in this account. Not ours to read a drawing for.
        log.warn('client.switch.missing', { clientId });
        return false;
      }

      return data.ai_extraction_enabled === true;
    },

    async areTablesAvailable() {
      // The cheapest question that distinguishes "the 008 tables are there"
      // from "they were rolled back under a deployment still running this
      // code". One indexed row, or none — the result is discarded.
      const { error } = await supabase
        .from('rfq_drawing_extractions')
        .select('id')
        .limit(1);

      if (error) {
        log.warn('tables.unavailable', {
          code: error.code ?? null,
          error: error.message,
        });
        return false;
      }

      return true;
    },

    async findPersistedExtraction(fileHash) {
      const { data, error } = await supabase
        .from('rfq_drawing_extractions')
        .select(
          'id, model, raw_response, rfq_drawing_findings(label, raw_text, confidence, domain, assignment_source)'
        )
        .eq('account_id', accountId)
        .eq('file_hash', fileHash)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        log.warn('cache.lookup.failed', { error: error.message });
        return null;
      }

      if (!data) return null;

      const rows = (data.rfq_drawing_findings ?? []) as PersistedFindingRow[];

      const cached: CompletedExtraction = {
        status: 'completed',
        fileHash,
        model: data.model ?? null,
        findings: rows.map(toDrawingFinding),
        rawResponse: data.raw_response ?? null,
      };

      return cached;
    },
  };
}

type PersistedFindingRow = {
  label: string | null;
  raw_text: string;
  confidence: string;
  domain: string | null;
  assignment_source: string | null;
};

/**
 * A stored finding, back in the pipeline's shape.
 *
 * `assignment_source` is widened by the schema to include `'user'`, which the
 * pipeline's type does not have. A user assignment on a cached row is dropped
 * back to null rather than replayed: it belongs to the RFQ it was made on, not
 * to the next one that happens to reuse the same drawing.
 */
function toDrawingFinding(row: PersistedFindingRow): DrawingFinding {
  const source =
    row.assignment_source === 'auto' || row.assignment_source === 'learned'
      ? row.assignment_source
      : null;

  return {
    label: row.label,
    rawText: row.raw_text,
    confidence: row.confidence === 'low' ? 'low' : 'high',
    domain: (row.domain ?? null) as DrawingFinding['domain'],
    assignmentSource: source,
  };
}
