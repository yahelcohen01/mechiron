import { createLogger, type Logger } from '@/lib/logger';

import type { CompletedExtraction } from './payload';
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

    const { error: findingsError } = await supabase
      .from('rfq_drawing_findings')
      .insert(
        input.extraction.findings.map((finding) => ({
          extraction_id: extraction.id,
          label: finding.label,
          raw_text: finding.rawText,
          confidence: finding.confidence,
          domain: finding.domain,
          assignment_source: finding.assignmentSource,
          applied: false,
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
    });
  } catch (error) {
    log.error('persist.threw', {
      rfqId: input.rfqId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
