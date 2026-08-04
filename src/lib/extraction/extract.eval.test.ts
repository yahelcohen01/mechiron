import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import {
  DEFAULT_EXTRACTION_MODEL,
  extractDrawingSpecs,
  type DrawingFinding,
  type ExtractionContext,
} from '@/lib/extraction';

/**
 * Evaluation lane — billed, non-deterministic, never run in CI.
 *
 *   AI_GATEWAY_API_KEY=… npm run test:eval
 *
 * Reading is already validated (PR #26: all six known lines character-exact).
 * What these tests exist to measure is the half nothing has measured yet —
 * whether the model puts a line in the right domain, and whether it declines
 * to guess when it should.
 *
 * **When a result here disagrees with the spec, check the drawing before
 * assuming the model is wrong.** This project has already recorded two wrong
 * values (`AMS-QQ-A-250/11` and `H-1075`; the sheets read `AMS 4027` and
 * `H1025`) and copied them into a ticket as pass/fail criteria, where they
 * would have failed a model that was reading correctly. There is no PDF
 * renderer on the dev machine — ask a human to look at the sheet.
 *
 * Model note: pinned to whatever `AI_EXTRACTION_MODEL` selects, defaulting to
 * `google/gemini-2.5-flash-lite`. That is not a considered shipping choice —
 * it is the only model the gateway key can currently reach (#27). Re-run this
 * lane against the shipping model once that is resolved.
 */

const context: ExtractionContext = {
  learnedMappings: [],
  existingVocabulary: [],
  tablesAvailable: true,
};

const readDrawing = async (filename: string) => ({
  bytes: new Uint8Array(
    await readFile(path.join(process.cwd(), 'examples', filename))
  ),
  filename,
});

const textFor = (findings: DrawingFinding[], domain: string) =>
  findings.filter((finding) => finding.domain === domain).map((f) => f.rawText);

const findByText = (findings: DrawingFinding[], needle: string) =>
  findings.find((finding) =>
    finding.rawText.toUpperCase().includes(needle.toUpperCase())
  );

describe(`sample 1 — ${DEFAULT_EXTRACTION_MODEL}`, () => {
  let findings: DrawingFinding[];

  beforeAll(async () => {
    const result = await extractDrawingSpecs(
      await readDrawing('test-n8n.pdf'),
      context
    );
    findings = result.findings;
    console.log('sample 1 findings:', JSON.stringify(findings, null, 2));
  });

  it('reads the aluminium plate spec as raw material', () => {
    expect(textFor(findings, 'raw_material')).toContain(
      'AL 6061 T651 PLATE PER AMS 4027'
    );
  });

  it('classifies the anodic coating callout as coating', () => {
    const coating = textFor(findings, 'coating');
    expect(coating.join(' | ')).toContain('ANODIC COATING PER MIL-PRF-8625');
  });

  it('assigns nothing to subcontractor', () => {
    expect(textFor(findings, 'subcontractor')).toEqual([]);
  });
});

describe(`sample 2 — ${DEFAULT_EXTRACTION_MODEL}`, () => {
  let findings: DrawingFinding[];

  beforeAll(async () => {
    const result = await extractDrawingSpecs(
      await readDrawing('test-n8n-2.pdf'),
      context
    );
    findings = result.findings;
    console.log('sample 2 findings:', JSON.stringify(findings, null, 2));
  });

  it('reads the CRES rod spec as raw material', () => {
    expect(textFor(findings, 'raw_material')).toContain(
      'CRES ROD 15-5PH PER AMS 5659'
    );
  });

  it('reads the passivation callout as passivation', () => {
    expect(textFor(findings, 'passivation')).toContain(
      'PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII'
    );
  });

  it('abstains on the H1025 heat-treat line rather than guessing a domain', () => {
    // The whole point of over-abstaining: this line is neither obviously
    // hardening nor obviously quenching, and picking wrong emails the wrong
    // category of supplier.
    const heatTreat = findByText(findings, 'H1025');
    expect(heatTreat).toBeDefined();
    expect(heatTreat?.domain).toBeNull();
  });

  it('abstains on the bake-after-plating line', () => {
    const bake = findByText(findings, 'BAKE PART AFTER PLATING');
    expect(bake).toBeDefined();
    expect(bake?.domain).toBeNull();
  });

  it('assigns nothing to subcontractor', () => {
    expect(textFor(findings, 'subcontractor')).toEqual([]);
  });
});

/**
 * Learned mappings are deliberately *not* evaluated here. Applying them is a
 * deterministic post-pass over whatever the model returned, fully covered
 * offline in `extract.test.ts`; a third billed read of the same sheet adds
 * almost nothing and reliably trips the free-tier rate limit (#27). Revisit
 * if mapping application ever stops being deterministic.
 */
