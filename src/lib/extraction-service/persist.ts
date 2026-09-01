import { createLogger, type Logger } from '@/lib/logger';

import type { CompletedExtraction } from './payload';
import { selectPrefills, type Prefill } from './prefill';
import { EXTRACTION_SERVICE_LOG_SCOPE } from './service';
import type { SupabaseServerClient } from './supabase-ports';

export type PersistExtractionInput = {
  accountId: string;
  rfqId: string;
  extraction: CompletedExtraction;
};

/**
 * Writes the extraction row and its findings, now that an `rfq_id` exists.
 *
 * This is the only place in the feature that writes to the database, and it
 * runs at submit — never at file-select. That split is what lets an abandoned
 * form leave nothing behind: no storage object, no row, nothing to sweep.
 *
 * **It never throws and never reports failure upward.** Non-blocking is
 * absolute: a failed extraction write must not fail, slow, or roll back the
 * RFQ the user actually came to create. A dropped write costs the findings and
 * a log line, and the user still has every value on screen.
 *
 * The findings arrive from client state and so are untrusted; they have been
 * shape-checked by `parseCompletedExtraction` before reaching here. The
 * account boundary does not depend on them: `account_id` is written from the
 * caller's own session, and the findings are reachable only through the
 * extraction row that carries it.
 *
 * It also writes the pre-filled spec values (#14). Doing it here, at creation,
 * rather than joining findings at render is what makes a pre-filled value
 * *real*: editable, savable, and visible to the send flow — which reads
 * `rfq_domain_configs` — without the user having to save first. Every such
 * value is stamped `spec_source = 'ai'`, which is what keeps an AI fill
 * distinguishable from a typed one and therefore bulk-clearable on rollback.
 */
export async function persistExtraction(
  supabase: SupabaseServerClient,
  input: PersistExtractionInput,
  logger?: Logger
): Promise<void> {
  const log =
    logger ?? createLogger({ scope: `${EXTRACTION_SERVICE_LOG_SCOPE}:persist` });

  try {
    const { data: extraction, error: extractionError } = await supabase
      .from('rfq_drawing_extractions')
      .insert({
        rfq_id: input.rfqId,
        account_id: input.accountId,
        file_hash: input.extraction.fileHash,
        status: 'completed',
        model: input.extraction.model,
        raw_response: input.extraction.rawResponse ?? null,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (extractionError || !extraction) {
      log.error('persist.extraction.failed', {
        rfqId: input.rfqId,
        error: extractionError?.message ?? 'no row returned',
      });
      return;
    }

    if (input.extraction.findings.length === 0) {
      log.info('persist.complete', { rfqId: input.rfqId, findings: 0 });
      return;
    }

    // The spec fields go in before the findings, so that `applied` records
    // what actually landed rather than what was intended. If the config write
    // fails, every finding is honestly marked unapplied.
    const prefills = selectPrefills(input.extraction.findings);
    const applied = await writePrefills(supabase, input.rfqId, prefills, log);

    const { error: findingsError } = await supabase
      .from('rfq_drawing_findings')
      .insert(
        input.extraction.findings.map((finding, index) => ({
          extraction_id: extraction.id,
          label: finding.label,
          raw_text: finding.rawText,
          confidence: finding.confidence,
          domain: finding.domain,
          assignment_source: finding.assignmentSource,
          applied: applied.has(index),
        }))
      );

    if (findingsError) {
      // The extraction row survives with no findings. That is a visible,
      // debuggable state; unwinding it would risk more than it fixes.
      log.error('persist.findings.failed', {
        rfqId: input.rfqId,
        extractionId: extraction.id,
        error: findingsError.message,
      });
      return;
    }

    log.info('persist.complete', {
      rfqId: input.rfqId,
      extractionId: extraction.id,
      findings: input.extraction.findings.length,
      prefilled: applied.size,
    });
  } catch (error) {
    log.error('persist.threw', {
      rfqId: input.rfqId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Creates the domain config rows that carry the pre-filled values.
 *
 * Returns the indexes of the findings that actually filled a field, for the
 * `applied` flag. An empty set on failure is not a fallback — it is the
 * accurate answer, and #16 and #19 both rely on `applied` meaning something.
 *
 * A plain `insert`, not an upsert: at creation time no config row for this
 * RFQ can exist yet, so a conflict would mean this ran somewhere it was not
 * meant to (a re-scan, #19). Failing there is correct — an AI value must
 * never overwrite one a user has already saved.
 */
async function writePrefills(
  supabase: SupabaseServerClient,
  rfqId: string,
  prefills: Prefill[],
  log: Logger
): Promise<Set<number>> {
  if (prefills.length === 0) return new Set();

  const { error } = await supabase.from('rfq_domain_configs').insert(
    prefills.map((prefill) => ({
      rfq_id: rfqId,
      domain: prefill.domain,
      spec_value: prefill.specValue,
      spec_source: 'ai',
    }))
  );

  if (error) {
    // Includes the case where 009 was rolled back and `spec_source` is gone.
    // The RFQ still exists with empty domains, which is the pre-#14 behaviour.
    log.warn('persist.prefill.failed', { rfqId, error: error.message });
    return new Set();
  }

  log.info('persist.prefill.complete', {
    rfqId,
    domains: prefills.map((p) => p.domain),
  });

  return new Set(prefills.map((p) => p.findingIndex));
}
