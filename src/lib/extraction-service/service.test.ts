import { describe, expect, it, vi } from 'vitest';

import { silentLogger } from '@/lib/logger';
import type { ExtractionResult } from '@/lib/extraction/types';

import { createExtractionCache } from './cache';
import { hashDrawingBytes } from './hash';
import { MAX_READABLE_BYTES, type CompletedExtraction } from './payload';
import {
  isGloballyEnabled,
  runDrawingExtraction,
  type ExtractionPorts,
  type RunExtractionInput,
} from './service';

const ACCOUNT_A = '11111111-1111-1111-1111-111111111111';
const ACCOUNT_B = '22222222-2222-2222-2222-222222222222';
const CLIENT = '33333333-3333-3333-3333-333333333333';

const bytes = (text = 'drawing bytes') => new TextEncoder().encode(text);

const input = (overrides: Partial<RunExtractionInput> = {}): RunExtractionInput => ({
  accountId: ACCOUNT_A,
  clientId: CLIENT,
  file: { bytes: bytes(), mediaType: 'application/pdf', filename: 'sheet.pdf' },
  ...overrides,
});

const result = (findings: ExtractionResult['findings'] = []): ExtractionResult => ({
  findings,
  model: 'test/model',
  rawResponse: { ok: true },
});

const finding = (rawText: string): ExtractionResult['findings'][number] => ({
  label: 'MATERIAL',
  rawText,
  confidence: 'high',
  domain: 'raw_material',
  assignmentSource: 'auto',
});

function ports(overrides: Partial<ExtractionPorts> = {}): ExtractionPorts {
  return {
    isClientExtractionEnabled: async () => true,
    areTablesAvailable: async () => true,
    findPersistedExtraction: async () => null,
    ...overrides,
  };
}

/** A pipeline stand-in that records whether it was ever reached. */
function spyExtract(value: ExtractionResult = result()) {
  return vi.fn(async () => value);
}

/** A minimal environment; `NODE_ENV` is required by the ProcessEnv type. */
const env = (vars: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  ...vars,
});

const options = (extra: Record<string, unknown> = {}) => ({
  logger: silentLogger,
  env: env(),
  cache: createExtractionCache(),
  ...extra,
});

describe('isGloballyEnabled', () => {
  it('is enabled when the variable is unset', () => {
    expect(isGloballyEnabled(env())).toBe(true);
  });

  it.each(['false', 'FALSE', ' false '])('is disabled for %o', (value) => {
    expect(isGloballyEnabled(env({ AI_EXTRACTION_ENABLED: value }))).toBe(false);
  });

  it('is enabled for any other value', () => {
    expect(isGloballyEnabled(env({ AI_EXTRACTION_ENABLED: 'true' }))).toBe(true);
  });
});

/**
 * These are confidentiality assertions, not feature-flag assertions. Each one
 * checks that the pipeline was never *called* — a version that called it and
 * discarded the result would satisfy "no extraction ran" and still have sent a
 * customer's drawing to a model provider.
 */
describe('kill switches: no bytes reach the model provider', () => {
  it('does not read when AI_EXTRACTION_ENABLED=false', async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input(),
      ports(),
      options({
        env: env({ AI_EXTRACTION_ENABLED: 'false' }),
        extract,
      })
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'globally-disabled' });
    expect(extract).not.toHaveBeenCalled();
  });

  it("does not read when the client's ai_extraction_enabled is false", async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input(),
      ports({ isClientExtractionEnabled: async () => false }),
      options({ extract })
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'client-disabled' });
    expect(extract).not.toHaveBeenCalled();
  });

  it('does not consult the cache when a switch is off', async () => {
    // A cache lookup on a disabled client would not transmit the drawing, but
    // it would still hash and query on behalf of a client we are forbidden to
    // process. The gate comes first.
    const findPersistedExtraction = vi.fn(async () => null);

    await runDrawingExtraction(
      input(),
      ports({ isClientExtractionEnabled: async () => false, findPersistedExtraction }),
      options({ extract: spyExtract() })
    );

    expect(findPersistedExtraction).not.toHaveBeenCalled();
  });

  it('does not read when the 008 tables are unavailable', async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input(),
      ports({ areTablesAvailable: async () => false }),
      options({ extract })
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'tables-unavailable' });
    expect(extract).not.toHaveBeenCalled();
  });
});

describe('size ceiling', () => {
  it('accepts but does not read a file over the readable limit', async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input({
        file: {
          bytes: new Uint8Array(MAX_READABLE_BYTES + 1),
          mediaType: 'application/pdf',
        },
      }),
      ports(),
      options({ extract })
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'too-large-to-read' });
    expect(extract).not.toHaveBeenCalled();
  });

  it('reads a file exactly at the readable limit', async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input({
        file: {
          bytes: new Uint8Array(MAX_READABLE_BYTES),
          mediaType: 'application/pdf',
        },
      }),
      ports(),
      options({ extract })
    );

    expect(outcome.status).toBe('completed');
    expect(extract).toHaveBeenCalledOnce();
  });

  it('skips an empty file without reading it', async () => {
    const extract = spyExtract();

    const outcome = await runDrawingExtraction(
      input({
        file: { bytes: new Uint8Array(0), mediaType: 'application/pdf' },
      }),
      ports(),
      options({ extract })
    );

    expect(outcome).toEqual({ status: 'skipped', reason: 'empty-file' });
    expect(extract).not.toHaveBeenCalled();
  });
});

describe('caching', () => {
  it('returns the same findings without a second model call', async () => {
    const extract = spyExtract(result([finding('AMS 4027')]));
    const shared = options({ extract, cache: createExtractionCache() });

    const first = await runDrawingExtraction(input(), ports(), shared);
    const second = await runDrawingExtraction(input(), ports(), shared);

    expect(extract).toHaveBeenCalledOnce();
    expect(first.status).toBe('completed');
    expect(second).toMatchObject({ status: 'completed', cached: true });
    expect(second).toMatchObject({ findings: [finding('AMS 4027')] });
  });

  it('reads again when the bytes differ', async () => {
    const extract = spyExtract();
    const shared = options({ extract, cache: createExtractionCache() });

    await runDrawingExtraction(input(), ports(), shared);
    await runDrawingExtraction(
      input({
        file: { bytes: bytes('a different drawing'), mediaType: 'application/pdf' },
      }),
      ports(),
      shared
    );

    expect(extract).toHaveBeenCalledTimes(2);
  });

  /** The criterion the ticket calls out explicitly. */
  it('does not hit across accounts', async () => {
    const extract = spyExtract(result([finding("ACCOUNT A'S DRAWING")]));
    const shared = options({ extract, cache: createExtractionCache() });

    await runDrawingExtraction(input({ accountId: ACCOUNT_A }), ports(), shared);
    const other = await runDrawingExtraction(
      input({ accountId: ACCOUNT_B }),
      ports(),
      shared
    );

    expect(extract).toHaveBeenCalledTimes(2);
    expect(other).toMatchObject({ cached: false });
  });

  it('scopes the persisted lookup to the posted bytes', async () => {
    const persisted: CompletedExtraction = {
      status: 'completed',
      fileHash: hashDrawingBytes(bytes()),
      model: 'stored/model',
      findings: [finding('H1025')],
    };
    const extract = spyExtract();
    const findPersistedExtraction = vi.fn(async (hash: string) =>
      hash === persisted.fileHash ? persisted : null
    );

    const outcome = await runDrawingExtraction(
      input(),
      ports({ findPersistedExtraction }),
      options({ extract })
    );

    expect(findPersistedExtraction).toHaveBeenCalledWith(persisted.fileHash);
    expect(extract).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: 'completed',
      cached: true,
      model: 'stored/model',
    });
  });
});

describe('failure handling', () => {
  it('retries exactly once, then reports failure', async () => {
    const extract = vi.fn(async () => {
      throw new Error('gateway 503');
    });

    const outcome = await runDrawingExtraction(
      input(),
      ports(),
      options({ extract })
    );

    expect(extract).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({ status: 'failed', message: 'gateway 503' });
  });

  it('succeeds when the retry succeeds', async () => {
    const extract = vi
      .fn<() => Promise<ExtractionResult>>()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(result([finding('AMS 5659')]));

    const outcome = await runDrawingExtraction(
      input(),
      ports(),
      options({ extract })
    );

    expect(extract).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ status: 'completed' });
  });

  it('does not cache a failure', async () => {
    const extract = vi.fn(async () => {
      throw new Error('gateway 503');
    });
    const shared = options({ extract, cache: createExtractionCache() });

    await runDrawingExtraction(input(), ports(), shared);
    await runDrawingExtraction(input(), ports(), shared);

    // Two attempts per call, twice over — a cached failure would have made the
    // second call free and permanently unrecoverable.
    expect(extract).toHaveBeenCalledTimes(4);
  });

  /**
   * The distinction the pipeline's docstring exists to protect: a read that
   * genuinely found nothing is a success, not a failure to retry.
   */
  it('reports an empty read as completed, not failed', async () => {
    const outcome = await runDrawingExtraction(
      input(),
      ports(),
      options({ extract: spyExtract(result([])) })
    );

    expect(outcome).toMatchObject({ status: 'completed', findings: [] });
  });
});

describe('what reaches the pipeline', () => {
  it("passes the file's real media type through", async () => {
    const extract = spyExtract();

    await runDrawingExtraction(
      input({
        file: { bytes: bytes(), mediaType: 'image/png', filename: 'sheet.png' },
      }),
      ports(),
      options({ extract })
    );

    expect(extract).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'image/png' }),
      expect.anything(),
      expect.anything()
    );
  });

  it('passes empty learned mappings and vocabulary (wiring them is #17)', async () => {
    const extract = spyExtract();

    await runDrawingExtraction(input(), ports(), options({ extract }));

    expect(extract).toHaveBeenCalledWith(
      expect.anything(),
      { learnedMappings: [], existingVocabulary: [], tablesAvailable: true },
      expect.anything()
    );
  });
});
