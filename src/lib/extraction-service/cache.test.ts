import { describe, expect, it } from 'vitest';

import { createExtractionCache } from './cache';
import { hashDrawingBytes } from './hash';
import type { CompletedExtraction } from './payload';

const ACCOUNT_A = 'account-a';
const ACCOUNT_B = 'account-b';
const HASH = 'a'.repeat(64);

const entry = (model: string): CompletedExtraction => ({
  status: 'completed',
  fileHash: HASH,
  model,
  findings: [],
});

describe('extraction cache', () => {
  it('returns what was stored', () => {
    const cache = createExtractionCache();
    cache.set(ACCOUNT_A, HASH, entry('m'));

    expect(cache.get(ACCOUNT_A, HASH)).toMatchObject({ model: 'm' });
  });

  it('misses for a different hash', () => {
    const cache = createExtractionCache();
    cache.set(ACCOUNT_A, HASH, entry('m'));

    expect(cache.get(ACCOUNT_A, 'b'.repeat(64))).toBeNull();
  });

  /**
   * The boundary that would be a confidentiality breach rather than a
   * performance bug if it leaked.
   */
  it('never serves one account an entry stored by another', () => {
    const cache = createExtractionCache();
    cache.set(ACCOUNT_A, HASH, entry('a'));

    expect(cache.get(ACCOUNT_B, HASH)).toBeNull();
  });

  it('keeps the two accounts entries independent for the same drawing', () => {
    const cache = createExtractionCache();
    cache.set(ACCOUNT_A, HASH, entry('a'));
    cache.set(ACCOUNT_B, HASH, entry('b'));

    expect(cache.get(ACCOUNT_A, HASH)).toMatchObject({ model: 'a' });
    expect(cache.get(ACCOUNT_B, HASH)).toMatchObject({ model: 'b' });
  });

  it('cannot be confused by an account id containing the separator', () => {
    const cache = createExtractionCache();
    // Without a delimiter-safe key, `("a", "b:c")` and `("a:b", "c")` collide.
    cache.set('a', `b:${HASH}`, entry('first'));

    expect(cache.get('a:b', HASH)).toBeNull();
  });

  it('expires an entry after its ttl', () => {
    let clock = 0;
    const cache = createExtractionCache({ ttlMs: 100, now: () => clock });
    cache.set(ACCOUNT_A, HASH, entry('m'));

    clock = 99;
    expect(cache.get(ACCOUNT_A, HASH)).not.toBeNull();

    clock = 100;
    expect(cache.get(ACCOUNT_A, HASH)).toBeNull();
  });

  it('evicts the oldest entry past its capacity', () => {
    const cache = createExtractionCache({ maxEntries: 2 });
    cache.set(ACCOUNT_A, 'a'.repeat(64), entry('1'));
    cache.set(ACCOUNT_A, 'b'.repeat(64), entry('2'));
    cache.set(ACCOUNT_A, 'c'.repeat(64), entry('3'));

    expect(cache.size()).toBe(2);
    expect(cache.get(ACCOUNT_A, 'a'.repeat(64))).toBeNull();
    expect(cache.get(ACCOUNT_A, 'c'.repeat(64))).not.toBeNull();
  });
});

describe('hashDrawingBytes', () => {
  it('is stable for the same bytes', () => {
    const bytes = new TextEncoder().encode('sheet');
    expect(hashDrawingBytes(bytes)).toBe(hashDrawingBytes(new TextEncoder().encode('sheet')));
  });

  it('differs for different bytes', () => {
    expect(hashDrawingBytes(new TextEncoder().encode('a'))).not.toBe(
      hashDrawingBytes(new TextEncoder().encode('b'))
    );
  });

  it('is a 64-character hex digest', () => {
    expect(hashDrawingBytes(new TextEncoder().encode('sheet'))).toMatch(/^[0-9a-f]{64}$/);
  });
});
