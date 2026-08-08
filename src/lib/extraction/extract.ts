import { toDrawingFindings } from './findings';
import { createLogger, type Logger } from '@/lib/logger';
import { callGatewayModel, type ModelRequest, type ModelResponse } from './model';
import { buildExtractionPrompt } from './prompt';
import type {
  DrawingFile,
  ExtractionContext,
  ExtractionResult,
} from './types';

/**
 * The model used unless overridden by `AI_EXTRACTION_MODEL`.
 *
 * Reading is solved even at the cheapest tier — both sample sheets came back
 * character-exact on this model — so the shipping choice should be driven by
 * classification quality, which is still unmeasured. It is not made here yet
 * because the gateway key is restricted to free tier (#27) and this is the
 * only model it can reach; defaulting to anything else would ship a 403.
 * Revisit once #27 clears.
 */
export const DEFAULT_EXTRACTION_MODEL = 'google/gemini-2.5-flash-lite';

/** Log scope for this feature; filter on it in platform log search. */
export const EXTRACTION_LOG_SCOPE = 'drawing-extraction';

export type ModelCall = (request: ModelRequest) => Promise<ModelResponse>;

export type ExtractOptions = {
  model?: string;
  /** Injection seam for the CI lane; defaults to the real gateway call. */
  callModel?: ModelCall;
  /**
   * Defaults to a `drawing-extraction` scoped logger at the app's `LOG_LEVEL`.
   * Pass `parentLogger.child('drawing-extraction')` from a request handler to
   * keep the run correlated with the request that caused it.
   */
  logger?: Logger;
};

/**
 * The one seam in the drawing-extraction feature: file bytes plus context in,
 * findings out. The route handler, the progress panel and the unassigned-
 * findings card are all thin glue around this function.
 *
 * **It persists nothing.** No storage writes, no database writes, no reads of
 * either. Extraction fires when the user picks a file, before any `rfq_id`
 * exists; the findings live in the form's client state until submit, and RFQ
 * creation writes them with the right `rfq_id`. Keeping persistence out of
 * here is what let the staging prefix, the second upload and the 24-hour
 * sweeper be deleted from the design.
 *
 * The `008` tables therefore reach this function only as
 * `context.tablesAvailable`. When they are gone, extraction reports finding
 * nothing instead of erroring the RFQ page — which is what makes the schema
 * rollback safe to perform independently of the code rollback.
 *
 * A model or gateway failure is *not* swallowed: it throws, so the caller can
 * tell "the read failed, offer a retry" apart from "this drawing has no
 * specifications on it". Extraction never blocking RFQ creation is the
 * caller's job, not this function's.
 */
export async function extractDrawingSpecs(
  file: DrawingFile,
  context: ExtractionContext,
  options: ExtractOptions = {}
): Promise<ExtractionResult> {
  const log = options.logger ?? createLogger({ scope: EXTRACTION_LOG_SCOPE });
  const empty: ExtractionResult = {
    findings: [],
    model: null,
    rawResponse: null,
  };

  log.info('extraction.start', {
    bytes: file.bytes.byteLength,
    filename: file.filename ?? null,
    mediaType: file.mediaType ?? 'application/pdf',
    learnedMappings: context.learnedMappings.length,
    existingVocabulary: context.existingVocabulary.length,
    tablesAvailable: context.tablesAvailable,
  });

  if (!context.tablesAvailable) {
    // Not an error. The 008 migration has been rolled back under a deployment
    // that still has this code, and degrading beats erroring the RFQ page.
    log.warn('extraction.skipped', {
      reason: 'the 008 tables are unavailable; nowhere to persist findings',
    });
    return empty;
  }

  if (file.bytes.byteLength === 0) {
    log.warn('extraction.skipped', { reason: 'empty file' });
    return empty;
  }

  const model =
    options.model ?? process.env.AI_EXTRACTION_MODEL ?? DEFAULT_EXTRACTION_MODEL;
  const callModel = options.callModel ?? callGatewayModel;
  const prompt = buildExtractionPrompt(context);

  log.info('model.request', {
    model,
    promptChars: prompt.length,
    bytes: file.bytes.byteLength,
  });
  log.debug('model.request.prompt', { prompt });

  const startedAt = Date.now();
  let response;
  try {
    response = await callModel({
      model,
      prompt,
      file: {
        bytes: file.bytes,
        mediaType: file.mediaType ?? 'application/pdf',
        filename: file.filename,
      },
    });
  } catch (error) {
    log.error('model.failed', {
      model,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const latencyMs = Date.now() - startedAt;
  log.info('model.response', {
    model,
    latencyMs,
    returnedFindings: response.findings?.length ?? 0,
    inputTokens: response.usage?.inputTokens ?? null,
    outputTokens: response.usage?.outputTokens ?? null,
    finishReason: response.finishReason ?? null,
  });

  if (response.finishReason === 'length') {
    // The answer was cut off, so callouts are missing from the end of it.
    // Silent loss is the failure user story 19 exists to prevent.
    log.warn('model.truncated', {
      model,
      reason: 'response hit the output limit; findings may be missing',
    });
  }

  const findings = toDrawingFindings(response.findings ?? [], context, log);

  log.info('extraction.complete', {
    model,
    latencyMs,
    totalMs: log.elapsed(),
    findings: findings.length,
  });

  return { findings, model, rawResponse: response.raw };
}
