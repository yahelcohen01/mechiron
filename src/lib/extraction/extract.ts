import { toDrawingFindings } from './findings';
import { createLogger, type Logger } from '@/lib/logger';
import {
  callGatewayModel,
  type ModelRequest,
  type ModelResponse,
  type ReasoningEffort,
} from './model';
import { buildExtractionPrompt } from './prompt';
import type {
  DrawingFile,
  ExtractionContext,
  ExtractionResult,
} from './types';

/**
 * The model used unless overridden by `AI_EXTRACTION_MODEL`.
 *
 * Chosen on measured evidence, two runs per configuration (#27):
 *
 * | model | correct | stable | latency | output tokens |
 * |---|---|---|---|---|
 * | `gemini-2.5-flash-lite` | no | no | 2.5-3.9 s | 144-293 |
 * | `gemini-3-flash` (default reasoning) | yes | yes | 16-52 s | 1974-6397 |
 * | `gemini-3-flash` + `reasoning: 'low'` | yes | yes | 2.5-3.6 s | 92-138 |
 *
 * **`flash-lite` was not chosen, and the belief that it had solved reading was
 * wrong.** It was only ever validated on `LABEL: value` callouts. On a
 * sentence-shaped note it split `BAKE PART AFTER PLATING WITHIN 3 HOURS…` into
 * a label `BAKE` plus a spec value beginning "PART AFTER PLATING", and
 * returned a different finding count on each of two consecutive runs. A
 * mutilated spec value reaching a supplier is the harm the whole trust surface
 * exists to prevent, so 1.4 s of latency is not worth it.
 *
 * `gemini-3.1-pro-preview` is reachable but rejected: preview status, slowest
 * of the candidates, and it returned an empty response to a trivial probe.
 */
export const DEFAULT_EXTRACTION_MODEL = 'google/gemini-3-flash';

/**
 * Which model a call with no explicit override will actually use.
 *
 * Exported because the evaluation lane has to *report* this, not just use it:
 * a run that names the default while the environment overrode it records the
 * wrong model against its own results, which is precisely the kind of
 * mislabelled evidence #27 exists to replace.
 */
export function resolveExtractionModel(): string {
  return process.env.AI_EXTRACTION_MODEL?.trim() || DEFAULT_EXTRACTION_MODEL;
}

/**
 * The reasoning budget used unless overridden by `AI_EXTRACTION_REASONING`.
 *
 * `'low'` rather than the provider default, because the default's thinking
 * bought nothing measurable and cost almost everything: identical findings on
 * both sheets, 46x the output tokens, and up to 52 s instead of 3 s. This is
 * the one setting that makes the accurate model also the fast one, so it is a
 * default in code rather than an environment variable someone has to remember.
 *
 * Do not raise it without re-running the evaluation lane twice at both values.
 */
export const DEFAULT_EXTRACTION_REASONING: ReasoningEffort = 'low';

const REASONING_EFFORTS: readonly ReasoningEffort[] = [
  'provider-default',
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
];

/**
 * How much reasoning the model may spend, from `AI_EXTRACTION_REASONING`,
 * defaulting to `DEFAULT_EXTRACTION_REASONING`.
 *
 * It stays overridable because it is the knob the lane has to vary to keep the
 * choice honest — re-measuring `'none'` or the provider default is how the
 * default above gets re-defended when the model changes.
 *
 * An unrecognised value falls back to the default rather than being fatal: a
 * typo in an env var must not take out RFQ creation, and must not silently
 * unleash a 52-second thinking budget either.
 */
export function resolveExtractionReasoning(): ReasoningEffort {
  const raw = process.env.AI_EXTRACTION_REASONING?.trim().toLowerCase();
  if (!raw) return DEFAULT_EXTRACTION_REASONING;
  return (
    REASONING_EFFORTS.find((effort) => effort === raw) ??
    DEFAULT_EXTRACTION_REASONING
  );
}

/** Log scope for this feature; filter on it in platform log search. */
export const EXTRACTION_LOG_SCOPE = 'drawing-extraction';

export type ModelCall = (request: ModelRequest) => Promise<ModelResponse>;

export type ExtractOptions = {
  model?: string;
  reasoning?: ReasoningEffort;
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

  const model = options.model ?? resolveExtractionModel();
  const reasoning = options.reasoning ?? resolveExtractionReasoning();
  const callModel = options.callModel ?? callGatewayModel;
  const prompt = buildExtractionPrompt(context);

  log.info('model.request', {
    model,
    reasoning,
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
      reasoning,
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
    reasoning,
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
