import { describe, expect, it } from 'vitest';

import {
  MAX_READABLE_BYTES,
  MAX_UPLOAD_BYTES,
  isAcceptedMediaType,
  parseCompletedExtraction,
} from './payload';

const valid = {
  status: 'completed',
  fileHash: 'a'.repeat(64),
  model: 'test/model',
  findings: [
    {
      label: 'MATERIAL',
      rawText: 'CRES ROD 15-5PH PER AMS 5659',
      confidence: 'high',
      domain: 'raw_material',
      assignmentSource: 'auto',
    },
  ],
};

describe('size limits', () => {
  it('reads a smaller file than it accepts', () => {
    // Two different limits for two different reasons — see payload.ts. If
    // these ever become equal, one of the two rationales has been lost.
    expect(MAX_READABLE_BYTES).toBeLessThan(MAX_UPLOAD_BYTES);
  });

  it('leaves room for base64 inflation under a 20MB provider cap', () => {
    expect(Math.ceil(MAX_READABLE_BYTES / 3) * 4).toBeLessThan(20 * 1024 * 1024);
  });
});

describe('isAcceptedMediaType', () => {
  it.each(['application/pdf', 'image/png', 'image/jpeg'])('accepts %s', (type) => {
    expect(isAcceptedMediaType(type)).toBe(true);
  });

  it.each(['image/gif', 'application/zip', '', 'text/html'])(
    'rejects %o',
    (type) => {
      expect(isAcceptedMediaType(type)).toBe(false);
    }
  );
});

/**
 * The findings make a round trip through the browser, so everything parsed
 * here is untrusted input on its way to an INSERT.
 */
describe('parseCompletedExtraction', () => {
  it('accepts a well-formed payload', () => {
    const parsed = parseCompletedExtraction(JSON.stringify(valid));
    expect(parsed).toMatchObject({ status: 'completed', model: 'test/model' });
    expect(parsed?.findings).toHaveLength(1);
  });

  it('accepts an unassigned finding', () => {
    const parsed = parseCompletedExtraction(
      JSON.stringify({
        ...valid,
        findings: [{ ...valid.findings[0], domain: null, assignmentSource: null }],
      })
    );
    expect(parsed?.findings[0].domain).toBeNull();
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
    ['not json', '{'],
    ['not an object', '"hello"'],
  ])('returns null when %s', (_label, raw) => {
    expect(parseCompletedExtraction(raw)).toBeNull();
  });

  it('rejects a non-completed status', () => {
    expect(
      parseCompletedExtraction(JSON.stringify({ ...valid, status: 'failed' }))
    ).toBeNull();
  });

  it('rejects a file hash that is not a sha-256 digest', () => {
    expect(
      parseCompletedExtraction(JSON.stringify({ ...valid, fileHash: 'nope' }))
    ).toBeNull();
  });

  it('rejects a domain outside the extractable set', () => {
    // `subcontractor` is a valid database domain but is deliberately never
    // extractable — a browser must not be able to write one via this path.
    expect(
      parseCompletedExtraction(
        JSON.stringify({
          ...valid,
          findings: [{ ...valid.findings[0], domain: 'subcontractor' }],
        })
      )
    ).toBeNull();
  });

  it("rejects an assignment source of 'user'", () => {
    expect(
      parseCompletedExtraction(
        JSON.stringify({
          ...valid,
          findings: [{ ...valid.findings[0], assignmentSource: 'user' }],
        })
      )
    ).toBeNull();
  });

  it('rejects an unbounded findings list', () => {
    expect(
      parseCompletedExtraction(
        JSON.stringify({
          ...valid,
          findings: Array.from({ length: 201 }, () => valid.findings[0]),
        })
      )
    ).toBeNull();
  });

  it('carries the raw response through for persistence', () => {
    const parsed = parseCompletedExtraction(
      JSON.stringify({ ...valid, rawResponse: { some: 'body' } })
    );
    expect(parsed?.rawResponse).toEqual({ some: 'body' });
  });
});
