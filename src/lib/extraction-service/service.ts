import { extractDrawingSpecs, type ExtractOptions } from '@/lib/extraction';
import type { DrawingFile } from '@/lib/extraction/types';
import { createLogger, type Logger } from '@/lib/logger';

import { processExtractionCache, type ExtractionCache } from './cache';
import { hashDrawingBytes } from './hash';
import {
  MAX_READABLE_BYTES,
  type CompletedExtraction,
  type ExtractionOutcome,
} from './payload';

/** Log scope for the request-side half of the feature. */
export const EXTRACTION_SERVICE_LOG_SCOPE = 'drawing-extraction-request';

/**
 * Everything the orchestration below needs from the outside world, as
 * functions rather than a Supabase client — so the kill switches and the cache
 * boundary can be tested exhaustively, offline and free, which is exactly
 * where a mistake would be a confidentiality bug rather than a nuisance.
 */
export type ExtractionPorts = {
  /** `clients.ai_extraction_enabled` for the selected client. */
  isClientExtractionEnabled: (clientId: string) => Promise<boolean>;
  /** Whether the `008` tables exist and are readable by this user. */
  areTablesAvailable: () => Promise<boolean>;
  /** A previously persisted read of these exact bytes, for this account. */
  findPersistedExtraction: (
    fileHash: string
  ) => Promise<CompletedExtraction | null>;
};

export type RunExtractionInput = {
  accountId: string;
  clientId: string;
  file: Required<Pick<DrawingFile, 'bytes' | 'mediaType'>> &
    Pick<DrawingFile, 'filename'>;
};

export type RunExtractionOptions = {
  logger?: Logger;
  env?: NodeJS.ProcessEnv;
  cache?: ExtractionCache;
  /** Injection seam for the CI lane; defaults to the real pipeline. */
  extract?: typeof extractDrawingSpecs;
  /** Passed straight through to the pipeline (its own model seam). */
  extractOptions?: ExtractOptions;
};

/** `AI_EXTRACTION_ENABLED=false` is the only value that disables it. */
export function isGloballyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AI_EXTRACTION_ENABLED?.trim().toLowerCase() !== 'false';
}

const skipped = (reason: Extract<ExtractionOutcome, { status: 'skipped' }>['reason']) =>
  ({ status: 'skipped', reason }) as const;

/**
 * The file-select request, end to end: gate it, look for a cached read, read
 * it if neither applies, and hand the findings back to the browser.
 *
 * **Nothing here writes to storage or to the database.** The findings live in
 * the form's client state until submit; `persistExtraction` writes them once
 * an `rfq_id` exists.
 *
 * The order of the checks below is load-bearing. Both kill switches and the
 * table probe are resolved *before* the bytes are hashed or handed to the
 * pipeline, because the guarantee being kept is not "extraction is skipped" —
 * it is "no bytes reach the model provider". A cheaper ordering that hashed
 * first would still be correct today and would rot the first time someone
 * added a step between the two.
 */
export async function runDrawingExtraction(
  input: RunExtractionInput,
  ports: ExtractionPorts,
  options: RunExtractionOptions = {}
): Promise<ExtractionOutcome> {
  const log =
    options.logger ?? createLogger({ scope: EXTRACTION_SERVICE_LOG_SCOPE });
  const env = options.env ?? process.env;
  const cache = options.cache ?? processExtractionCache;
  const extract = options.extract ?? extractDrawingSpecs;

  log.info('request.start', {
    bytes: input.file.bytes.byteLength,
    mediaType: input.file.mediaType,
    filename: input.file.filename ?? null,
  });

  if (!isGloballyEnabled(env)) {
    log.info('request.skipped', { reason: 'globally-disabled' });
    return skipped('globally-disabled');
  }

  if (input.file.bytes.byteLength === 0) {
    log.info('request.skipped', { reason: 'empty-file' });
    return skipped('empty-file');
  }

  if (input.file.bytes.byteLength > MAX_READABLE_BYTES) {
    // Accepted, not read. See MAX_READABLE_BYTES for why this is not the same
    // number as the endpoint's ceiling.
    log.info('request.skipped', {
      reason: 'too-large-to-read',
      bytes: input.file.bytes.byteLength,
      limit: MAX_READABLE_BYTES,
    });
    return skipped('too-large-to-read');
  }

  const [clientEnabled, tablesAvailable] = await Promise.all([
    ports.isClientExtractionEnabled(input.clientId),
    ports.areTablesAvailable(),
  ]);

  if (!clientEnabled) {
    log.info('request.skipped', { reason: 'client-disabled' });
    return skipped('client-disabled');
  }

  if (!tablesAvailable) {
    // The pipeline would also refuse this, but returning here keeps the
    // promise explicit at the boundary that owns it rather than relying on a
    // second module to hold the line.
    log.warn('request.skipped', { reason: 'tables-unavailable' });
    return skipped('tables-unavailable');
  }

  const fileHash = hashDrawingBytes(input.file.bytes);
  const childLog = log.child('cache');

  const memoryHit = cache.get(input.accountId, fileHash);
  if (memoryHit) {
    childLog.info('hit', { layer: 'memory', findings: memoryHit.findings.length });
    return { ...memoryHit, cached: true };
  }

  const persistedHit = await ports.findPersistedExtraction(fileHash);
  if (persistedHit) {
    childLog.info('hit', {
      layer: 'database',
      findings: persistedHit.findings.length,
    });
    cache.set(input.accountId, fileHash, persistedHit);
    return { ...persistedHit, cached: true };
  }

  childLog.info('miss', {});

  const result = await readWithOneRetry(
    () =>
      extract(
        input.file,
        {
          // Wiring these to real data is #17. Empty arrays are the honest
          // input today; the pipeline handles them.
          learnedMappings: [],
          existingVocabulary: [],
          tablesAvailable: true,
        },
        {
          // A child logger, not a fresh one: it shares this request's run id,
          // so a log search links the read to the request that caused it.
          logger: log.child('pipeline'),
          ...options.extractOptions,
        }
      ),
    log
  );

  if (!result.ok) {
    // Deliberately not converted into an empty-findings success. "The read
    // failed, offer a retry" and "this drawing has no specifications on it"
    // are different answers and the user is owed the difference.
    log.error('request.failed', { error: result.message });
    return { status: 'failed', message: result.message };
  }

  const completed: CompletedExtraction = {
    status: 'completed',
    fileHash,
    model: result.value.model,
    findings: result.value.findings,
    rawResponse: result.value.rawResponse,
  };

  cache.set(input.accountId, fileHash, completed);

  log.info('request.complete', {
    findings: completed.findings.length,
    model: completed.model,
    totalMs: log.elapsed(),
  });

  return { ...completed, cached: false };
}

type Attempt<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

/**
 * One automatic retry, and only one — the cap the ticket sets. A transient
 * gateway error is worth a second try; a rate limit or a bad model id is not
 * worth a third, and the user has an explicit retry of their own.
 */
async function readWithOneRetry<T>(
  attempt: () => Promise<T>,
  log: Logger
): Promise<Attempt<T>> {
  try {
    return { ok: true, value: await attempt() };
  } catch (first) {
    const message = first instanceof Error ? first.message : String(first);
    log.warn('read.retrying', { error: message });

    try {
      return { ok: true, value: await attempt() };
    } catch (second) {
      return {
        ok: false,
        message: second instanceof Error ? second.message : String(second),
      };
    }
  }
}
