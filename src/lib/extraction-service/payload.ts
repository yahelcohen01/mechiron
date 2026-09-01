/**
 * The wire contract shared by the three parties in the file-select flow.
 *
 * The route handler produces an `ExtractionOutcome`; the form holds a
 * `completed` one in client state; `createRfq` receives it back at submit and
 * writes it to the database. It lives here rather than beside any one of them
 * because all three must agree on it.
 *
 * Deliberately free of `node:` builtins and of the `@/lib/extraction` barrel
 * (which pulls in the `ai` SDK) — the client form imports the size limits from
 * here, so nothing server-only may leak in through this file.
 */
import { z } from 'zod';

import {
  EXTRACTABLE_DOMAINS,
  type DrawingFinding,
} from '@/lib/extraction/types';

/**
 * The endpoint's hard ceiling, matched to the form's own client-side limit so
 * that no file the form accepts is rejected by the server with what would read
 * as a bug. Above this the request is refused outright.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * The largest file that can actually be *read*, which is a smaller number than
 * the one above and for an unrelated reason.
 *
 * The drawing is sent to the model inline in the request body, base64-encoded
 * (`model.ts`), and base64 inflates bytes by a third. The provider caps a whole
 * request at roughly 20 MB, so ~15 MB of file is the real limit; 14 MB leaves
 * room for the prompt and the JSON envelope.
 *
 * A file between this and `MAX_UPLOAD_BYTES` is not an error. It is accepted,
 * not read, and reported as skipped — the user fills the specs in by hand, as
 * they do today.
 */
export const MAX_READABLE_BYTES = 14 * 1024 * 1024;

/** Mirrors the form's `accept` attribute. The route re-checks it server-side. */
export const ACCEPTED_MEDIA_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];

export const isAcceptedMediaType = (value: string): value is AcceptedMediaType =>
  (ACCEPTED_MEDIA_TYPES as readonly string[]).includes(value);

/**
 * Why a drawing was accepted but never read. Every one of these is a normal
 * outcome that leaves the form fully usable — none is a failure.
 */
export type SkipReason =
  /** `AI_EXTRACTION_ENABLED=false`. */
  | 'globally-disabled'
  /** `clients.ai_extraction_enabled = false` for the selected client. */
  | 'client-disabled'
  /** The `008` tables are gone or unreadable; nowhere to persist findings. */
  | 'tables-unavailable'
  /** Over `MAX_READABLE_BYTES` — larger than the model can be sent. */
  | 'too-large-to-read'
  | 'empty-file';

export type CompletedExtraction = {
  status: 'completed';
  /** SHA-256 of the posted bytes. The cache key, and `file_hash` at submit. */
  fileHash: string;
  model: string | null;
  findings: DrawingFinding[];
  /** Round-tripped so `createRfq` can write `raw_response` without re-reading. */
  rawResponse?: unknown;
  /** True when no model call was made. Informational; not persisted. */
  cached?: boolean;
};

export type ExtractionOutcome =
  | CompletedExtraction
  | { status: 'skipped'; reason: SkipReason }
  | { status: 'failed'; message: string };

/**
 * Validation for the outcome the browser posts back at submit.
 *
 * The findings make a round trip through client state — that is the design the
 * ticket mandates, since extraction runs before an `rfq_id` exists — so what
 * comes back is untrusted input and is shape-checked here before it reaches an
 * INSERT. The account boundary is enforced separately, by `createRfq` writing
 * its own `account_id` rather than any value from this payload.
 */
export const findingPayloadSchema = z.object({
  label: z.string().max(200).nullable(),
  rawText: z.string().max(4000),
  confidence: z.enum(['high', 'low']),
  domain: z.enum([...EXTRACTABLE_DOMAINS]).nullable(),
  assignmentSource: z.enum(['auto', 'learned']).nullable(),
});

export const completedExtractionSchema = z.object({
  status: z.literal('completed'),
  fileHash: z.string().regex(/^[0-9a-f]{64}$/),
  model: z.string().max(200).nullable(),
  findings: z.array(findingPayloadSchema).max(200),
  rawResponse: z.unknown().optional(),
  cached: z.boolean().optional(),
});

/**
 * Parses the `extraction` form field written by the browser at submit.
 * Returns null for anything absent, malformed, or not a completed read —
 * there is nothing to persist in those cases and nothing to report either.
 */
export function parseCompletedExtraction(
  raw: unknown
): CompletedExtraction | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = completedExtractionSchema.safeParse(decoded);
  return parsed.success ? (parsed.data as CompletedExtraction) : null;
}
