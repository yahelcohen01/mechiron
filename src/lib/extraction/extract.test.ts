import { describe, expect, it, vi } from 'vitest';

import { extractDrawingSpecs } from '@/lib/extraction';
import type {
  ExtractionContext,
  ModelCall,
  ModelFinding,
} from '@/lib/extraction';

/**
 * CI lane — deterministic, offline, free. Every model call here is a stub.
 *
 * These tests assert what a caller of the seam can observe: which findings
 * come out for a given model response and context. They deliberately do not
 * assert how the prompt is worded, only that data the *caller supplied*
 * reaches the model — a regression where context silently stops being
 * injected is invisible to every other test in this file.
 */

const emptyContext: ExtractionContext = {
  learnedMappings: [],
  existingVocabulary: [],
  tablesAvailable: true,
};

const drawing = { bytes: new Uint8Array([1, 2, 3]), filename: 'sheet.pdf' };

/** A stub model that always answers with the given findings. */
const respondWith = (findings: ModelFinding[]): ModelCall =>
  vi.fn(async () => ({ findings, raw: { findings } }));

const material: ModelFinding = {
  label: 'MATERIAL',
  text: 'AL 6061 T651 PLATE PER AMS 4027',
  confidence: 'high',
  domain: 'raw_material',
};

describe('extractDrawingSpecs — model response handling', () => {
  it('returns the findings the model read, classified', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([material]),
    });

    expect(result.findings).toEqual([
      {
        label: 'MATERIAL',
        rawText: 'AL 6061 T651 PLATE PER AMS 4027',
        confidence: 'high',
        domain: 'raw_material',
        assignmentSource: 'auto',
      },
    ]);
  });

  it('turns the model\'s abstention sentinel into an unassigned finding', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([
        {
          label: null,
          text: 'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D',
          confidence: 'high',
          domain: 'unknown',
        },
      ]),
    });

    expect(result.findings[0].domain).toBeNull();
    expect(result.findings[0].assignmentSource).toBeNull();
    expect(result.findings[0].rawText).toBe(
      'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D'
    );
  });

  it('never emits a subcontractor classification, even if the model asks for one', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([
        {
          label: 'NOTE',
          text: 'OUTSIDE PROCESSING REQUIRED',
          confidence: 'high',
          // Not offered by the schema; guarded anyway because the cost of a
          // wrong subcontractor assignment is an email to the wrong supplier.
          domain: 'subcontractor' as unknown as 'raw_material',
        },
      ]),
    });

    expect(result.findings[0].domain).toBeNull();
  });

  it('keeps low confidence independent of the assigned domain', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([{ ...material, confidence: 'low' }]),
    });

    // The finding stays classified; it is the *auto-fill* decision downstream
    // that low confidence blocks, not the classification itself.
    expect(result.findings[0].confidence).toBe('low');
    expect(result.findings[0].domain).toBe('raw_material');
  });

  it('drops malformed findings rather than failing the whole extraction', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: vi.fn(async () => ({
        findings: [
          { label: null, text: '', confidence: 'high', domain: 'unknown' },
          material,
        ] as ModelFinding[],
        raw: null,
      })),
    });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].rawText).toBe(material.text);
  });

  it('strips a leading label the model left on the value', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([
        {
          label: 'MATERIAL',
          text: 'MATERIAL: AL 6061 T651 PLATE PER AMS 4027.',
          confidence: 'high',
          domain: 'raw_material',
        },
      ]),
    });

    expect(result.findings[0].rawText).toBe('AL 6061 T651 PLATE PER AMS 4027');
  });

  it('strips an unlabelled callout prefix written with a spaced dash', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([
        {
          label: null,
          text: 'FINISH - PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII.',
          confidence: 'high',
          domain: 'passivation',
        },
      ]),
    });

    expect(result.findings[0].rawText).toBe(
      'PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII'
    );
  });

  it('does not mistake a hyphen inside a standard designation for a label', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      callModel: respondWith([
        {
          label: null,
          text: 'ANODIC PER MIL-PRF-8625 TYPE I CLASS 1',
          confidence: 'high',
          domain: 'coating',
        },
      ]),
    });

    expect(result.findings[0].rawText).toBe(
      'ANODIC PER MIL-PRF-8625 TYPE I CLASS 1'
    );
  });

  it('reports the model it used', async () => {
    const result = await extractDrawingSpecs(drawing, emptyContext, {
      model: 'google/gemini-2.5-flash-lite',
      callModel: respondWith([material]),
    });

    expect(result.model).toBe('google/gemini-2.5-flash-lite');
  });
});

describe('extractDrawingSpecs — learned mappings', () => {
  it('classifies a specification the model abstained on', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      {
        ...emptyContext,
        learnedMappings: [{ pattern: 'AMS-H-6875', domain: 'hardening' }],
      },
      {
        callModel: respondWith([
          {
            label: null,
            text: 'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D',
            confidence: 'high',
            domain: 'unknown',
          },
        ]),
      }
    );

    expect(result.findings[0].domain).toBe('hardening');
    expect(result.findings[0].assignmentSource).toBe('learned');
  });

  it('matches a pattern regardless of case and surrounding whitespace', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      {
        ...emptyContext,
        learnedMappings: [{ pattern: '  ams-h-6875  ', domain: 'hardening' }],
      },
      {
        callModel: respondWith([
          {
            label: null,
            text: 'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D',
            confidence: 'high',
            domain: 'unknown',
          },
        ]),
      }
    );

    expect(result.findings[0].domain).toBe('hardening');
  });

  it('leaves a finding the model already classified alone', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      {
        ...emptyContext,
        learnedMappings: [{ pattern: 'AMS 4027', domain: 'coating' }],
      },
      { callModel: respondWith([material]) }
    );

    // The model saw the whole drawing; a mapping is a fallback for what it
    // could not place, not an override of what it could.
    expect(result.findings[0].domain).toBe('raw_material');
    expect(result.findings[0].assignmentSource).toBe('auto');
  });

  it('leaves a finding unassigned when no mapping matches', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      {
        ...emptyContext,
        learnedMappings: [{ pattern: 'ASTM B850', domain: 'quenching' }],
      },
      {
        callModel: respondWith([
          {
            label: null,
            text: 'HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D',
            confidence: 'high',
            domain: 'unknown',
          },
        ]),
      }
    );

    expect(result.findings[0].domain).toBeNull();
  });
});

describe('extractDrawingSpecs — existing vocabulary', () => {
  it('emits the account\'s existing string rather than a near-miss variant', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      {
        ...emptyContext,
        existingVocabulary: ['PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII'],
      },
      {
        callModel: respondWith([
          {
            label: 'FINISH',
            text: 'Passivation treatment per AMS QQ P 35, Type VIII',
            confidence: 'high',
            domain: 'passivation',
          },
        ]),
      }
    );

    expect(result.findings[0].rawText).toBe(
      'PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII'
    );
  });

  it('leaves a reading with no vocabulary match verbatim', async () => {
    const result = await extractDrawingSpecs(
      drawing,
      { ...emptyContext, existingVocabulary: ['CRES ROD 15-5PH PER AMS 5659'] },
      { callModel: respondWith([material]) }
    );

    expect(result.findings[0].rawText).toBe('AL 6061 T651 PLATE PER AMS 4027');
  });
});

describe('extractDrawingSpecs — context reaches the model', () => {
  it('sends the drawing bytes as a PDF file part', async () => {
    const callModel = respondWith([material]);
    await extractDrawingSpecs(drawing, emptyContext, { callModel });

    const request = vi.mocked(callModel).mock.calls[0][0];
    expect(request.file.bytes).toBe(drawing.bytes);
    expect(request.file.mediaType).toBe('application/pdf');
  });

  it('injects the supplied mappings and vocabulary', async () => {
    const callModel = respondWith([material]);
    await extractDrawingSpecs(
      drawing,
      {
        learnedMappings: [{ pattern: 'AMS-H-6875', domain: 'hardening' }],
        existingVocabulary: ['CRES ROD 15-5PH PER AMS 5659'],
        tablesAvailable: true,
      },
      { callModel }
    );

    // Asserting the caller's *data* is present, never our wording around it.
    const { prompt } = vi.mocked(callModel).mock.calls[0][0];
    expect(prompt).toContain('AMS-H-6875');
    expect(prompt).toContain('hardening');
    expect(prompt).toContain('CRES ROD 15-5PH PER AMS 5659');
  });
});

describe('extractDrawingSpecs — degradation', () => {
  it('finds nothing, without calling the model, when the 008 tables are absent', async () => {
    const callModel = respondWith([material]);
    const result = await extractDrawingSpecs(
      drawing,
      { ...emptyContext, tablesAvailable: false },
      { callModel }
    );

    expect(result.findings).toEqual([]);
    expect(result.model).toBeNull();
    expect(callModel).not.toHaveBeenCalled();
  });

  it('propagates a model failure rather than reporting an empty read', async () => {
    // Deliberately not swallowed. "The gateway is down" and "this drawing has
    // no specifications on it" are different outcomes, and the form shows a
    // retry affordance for only one of them.
    await expect(
      extractDrawingSpecs(drawing, emptyContext, {
        callModel: vi.fn(async () => {
          throw new Error('gateway timeout');
        }),
      })
    ).rejects.toThrow();
  });

  it('finds nothing when the drawing is empty', async () => {
    const callModel = respondWith([material]);
    const result = await extractDrawingSpecs(
      { bytes: new Uint8Array() },
      emptyContext,
      { callModel }
    );

    expect(result.findings).toEqual([]);
    expect(callModel).not.toHaveBeenCalled();
  });
});
