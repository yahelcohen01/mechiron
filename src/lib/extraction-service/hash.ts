import { createHash } from 'node:crypto';

/**
 * The cache key: SHA-256 of the exact bytes posted, hex-encoded.
 *
 * Content-addressed rather than name-addressed on purpose — two accounts
 * uploading `drawing.pdf` must not collide, and one account re-exporting the
 * same sheet under a new filename must still hit the cache. The account is
 * carried alongside the hash by every caller, never mixed into it, so that a
 * lookup can never be satisfied by another tenant's row.
 */
export function hashDrawingBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
