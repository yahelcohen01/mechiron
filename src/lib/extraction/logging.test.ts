import { describe, expect, it, vi } from 'vitest';

import { extractDrawingSpecs } from '@/lib/extraction';
import type { ExtractionContext, ModelCall, ModelFinding } from '@/lib/extraction';
import { capturingLogger } from '@/test/capturing-logger';

/**
 * What the pipeline reports about itself. The generic logger's own behaviour
 * lives in `src/lib/logger.test.ts`; these tests only assert that the events a
 * human would need in order to explain a surprising extraction are actually
 * emitted.
 */

const context: ExtractionContext = {
  learnedMappings: [],
  existingVocabulary: [],
  tablesAvailable: true,
};

const drawing = { bytes: new Uint8Array([1, 2, 3]), filename: 'sheet.pdf' };

const respondWith = (findings: ModelFinding[]): ModelCall =>
  vi.fn(async () => ({ findings, raw: null }));

const heatTreat: ModelFinding = {
  label: null,
  text: 'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D',
  confidence: 'high',
  domain: 'hardening',
};

const material: ModelFinding = {
  label: 'MATERIAL',
  text: 'AL 6061 T651 PLATE PER AMS 4027',
  confidence: 'high',
  domain: 'raw_material',
};

const run = async (
  callModel: ModelCall,
  overrides: Partial<ExtractionContext> = {},
  level: 'info' | 'debug' = 'debug'
) => {
  const captured = capturingLogger('drawing-extraction', level);
  await extractDrawingSpecs(
    drawing,
    { ...context, ...overrides },
    { logger: captured.logger, callModel }
  ).catch(() => undefined);
  return captured;
};

describe('extraction logging', () => {
  it('records why an extraction produced nothing', async () => {
    const { lines } = await run(respondWith([]), { tablesAvailable: false });

    const skipped = lines.find((line) => line.event === 'extraction.skipped');
    expect(skipped?.level).toBe('warn');
    expect(String(skipped?.reason)).toContain('008');
  });

  it('records a guard override, the failure most worth noticing', async () => {
    const { lines } = await run(respondWith([heatTreat]));

    const override = lines.find(
      (line) => line.event === 'finding.guard_override'
    );
    expect(override).toMatchObject({ proposed: 'hardening' });
  });

  it('records when a learned mapping did the classifying', async () => {
    const { lines } = await run(respondWith([heatTreat]), {
      learnedMappings: [{ pattern: 'AMS-H-6875', domain: 'hardening' }],
    });

    expect(
      lines.find((line) => line.event === 'finding.learned_mapping_applied')
    ).toMatchObject({ domain: 'hardening', pattern: 'AMS-H-6875' });
  });

  it('summarises a run with counts a human can scan', async () => {
    const { lines } = await run(respondWith([heatTreat, material]));

    expect(
      lines.find((line) => line.event === 'findings.summary')
    ).toMatchObject({
      returnedByModel: 2,
      kept: 2,
      unassigned: 1,
      guardOverrides: 1,
    });
  });

  it('logs a model failure before rethrowing it', async () => {
    const { lines } = await run(
      vi.fn(async () => {
        throw new Error('gateway timeout');
      })
    );

    const failure = lines.find((line) => line.event === 'model.failed');
    expect(failure?.level).toBe('error');
    expect(failure?.error).toBe('gateway timeout');
  });

  it('warns when the model response was truncated', async () => {
    const { events } = await run(
      vi.fn(async () => ({ findings: [], raw: null, finishReason: 'length' }))
    );

    // A truncated answer means callouts are missing off the end of it, which
    // otherwise looks identical to a drawing that simply had fewer callouts.
    expect(events()).toContain('model.truncated');
  });

  it('keeps drawing text out of the logs below debug level', async () => {
    const { lines } = await run(respondWith([heatTreat]), {}, 'info');

    // Customer drawing content is sensitive per the spec's disclosure note; at
    // info you get lengths and decisions, not the specification itself.
    expect(JSON.stringify(lines)).not.toContain('H1025');
    expect(JSON.stringify(lines)).toContain('finding.classified');
  });

  it('includes the verbatim text at debug, for when you do need it', async () => {
    const { lines } = await run(respondWith([heatTreat]), {}, 'debug');
    expect(JSON.stringify(lines)).toContain('H1025');
  });
});
