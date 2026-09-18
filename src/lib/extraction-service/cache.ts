import type { CompletedExtraction } from './payload';

/**
 * A short-lived, in-process cache of completed reads.
 *
 * It exists because nothing is persisted at file-select time, so the database
 * cannot answer "have we already read this?" until an RFQ has actually been
 * submitted. Without this layer the two cases the ticket calls out — a retry
 * after a failure, and the same file picked twice — would each bill a second
 * model call.
 *
 * Memory only. It writes nothing to storage or to the database, which is what
 * keeps the "nothing is persisted at file-select time" rule intact.
 *
 * **The account is part of the key, not an afterthought.** A cache that could
 * return one tenant's reading of a drawing to another tenant would be a
 * confidentiality breach, not a performance bug, so the boundary is built into
 * the key rather than checked by the caller.
 *
 * Bounded and expiring because entries hold customer document content: a lost
 * entry costs one model call, whereas an unbounded one grows without limit in
 * a long-lived server process.
 */

const DEFAULT_MAX_ENTRIES = 50;
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export type ExtractionCache = {
  get: (accountId: string, fileHash: string) => CompletedExtraction | null;
  set: (
    accountId: string,
    fileHash: string,
    value: CompletedExtraction
  ) => void;
  /** Entry count, for tests and for a future metric. */
  size: () => number;
};

export type CreateExtractionCacheOptions = {
  maxEntries?: number;
  ttlMs?: number;
  /** Injection point for tests; defaults to the real clock. */
  now?: () => number;
};

type Entry = { value: CompletedExtraction; expiresAt: number };

/**
 * Length-prefixed so the two halves cannot be confused for one another. A
 * plain `a:b` join makes `("x", "y:z")` and `("x:y", "z")` the same key, which
 * would be a cross-account read. Account ids are UUIDs today and could never
 * trigger it — this costs one number and removes the class of bug entirely.
 */
const keyFor = (accountId: string, fileHash: string) =>
  `${accountId.length}:${accountId}:${fileHash}`;

export function createExtractionCache(
  options: CreateExtractionCacheOptions = {}
): ExtractionCache {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? Date.now;

  // A Map iterates in insertion order, which is all that is needed to evict
  // the oldest entry. Re-inserting on a hit would make it a true LRU; it is
  // not worth the extra write for a cache this small.
  const entries = new Map<string, Entry>();

  return {
    get(accountId, fileHash) {
      const key = keyFor(accountId, fileHash);
      const entry = entries.get(key);
      if (!entry) return null;

      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }

      return entry.value;
    },

    set(accountId, fileHash, value) {
      const key = keyFor(accountId, fileHash);
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });

      while (entries.size > maxEntries) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },

    size: () => entries.size,
  };
}

/**
 * The instance the route handler uses. Per server instance, so a deployment
 * running several of them simply gets a lower hit rate — never a wrong answer.
 */
export const processExtractionCache = createExtractionCache();
