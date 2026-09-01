/**
 * The request-side half of drawing auto-detection: everything between an HTTP
 * request and the pure pipeline in `@/lib/extraction`.
 *
 * The split is deliberate. `@/lib/extraction` reads a drawing and knows
 * nothing of Supabase, accounts, caching or kill switches; this module knows
 * all four and nothing about how a drawing is read. Keeping the pipeline free
 * of the database is what let the staging prefix and the 24-hour sweeper be
 * deleted from the design.
 *
 * **This barrel is server-only** — it reaches `node:crypto` and the Supabase
 * server client. Client components import `./payload` directly, which is kept
 * free of both so that the size limits can be shared with the form.
 */
export { hashDrawingBytes } from './hash';
export {
  createExtractionCache,
  processExtractionCache,
  type ExtractionCache,
} from './cache';
export { persistExtraction, type PersistExtractionInput } from './persist';
export {
  EXTRACTION_SERVICE_LOG_SCOPE,
  isGloballyEnabled,
  runDrawingExtraction,
  type ExtractionPorts,
  type RunExtractionInput,
  type RunExtractionOptions,
} from './service';
export {
  createSupabasePorts,
  type SupabaseServerClient,
} from './supabase-ports';
export {
  ACCEPTED_MEDIA_TYPES,
  MAX_READABLE_BYTES,
  MAX_UPLOAD_BYTES,
  completedExtractionSchema,
  isAcceptedMediaType,
  parseCompletedExtraction,
  type AcceptedMediaType,
  type CompletedExtraction,
  type ExtractionOutcome,
  type SkipReason,
} from './payload';
