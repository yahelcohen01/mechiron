import { describe, expect, it } from 'vitest';

import type { DrawingFinding } from '@/lib/extraction/types';

import { selectPrefills } from './prefill';

const finding = (over: Partial<DrawingFinding> = {}): DrawingFinding => ({
  label: 'MATERIAL',
  rawText: 'CRES ROD 15-5PH PER AMS 5659',
  confidence: 'high',
  domain: 'raw_material',
  assignmentSource: 'auto',
  ...over,
});

describe('selectPrefills — the eligibility gate', () => {
  it('fills a domain from a single high-confidence, classified finding', () => {
    expect(selectPrefills([finding()])).toEqual([
      {
        domain: 'raw_material',
        specValue: 'CRES ROD 15-5PH PER AMS 5659',
        findingIndex: 0,
      },
    ]);
  });

  it('fills each domain independently', () => {
    const prefills = selectPrefills([
      finding(),
      finding({ label: 'FINISH', rawText: 'ANODIZE', domain: 'coating' }),
    ]);

    expect(prefills.map((p) => p.domain)).toEqual(['raw_material', 'coating']);
  });

  /**
   * Confidence and classification are separate fields on purpose: a line can
   * be read perfectly and still be unclassifiable, and a line can be
   * classified obviously and still be half-guessed pixels. Both must pass.
   */
  it('never fills from a low-confidence finding, however well classified', () => {
    expect(selectPrefills([finding({ confidence: 'low' })])).toEqual([]);
  });

  it('never fills from an unclassified finding, however confidently read', () => {
    expect(selectPrefills([finding({ domain: null })])).toEqual([]);
  });

  it('rejects a finding whose text is blank', () => {
    expect(selectPrefills([finding({ rawText: '   ' })])).toEqual([]);
  });

  it('trims the value it writes', () => {
    expect(selectPrefills([finding({ rawText: '  ANODIZE  ' })])[0].specValue).toBe('ANODIZE');
  });

  /**
   * `rfq_domain_configs` is UNIQUE (rfq_id, domain), so only one value can
   * win — and two equally-confident readings cannot be honestly ranked.
   * Filling nothing keeps both findings unapplied, which is what puts them in
   * front of the user in the unassigned-findings card (#16) instead of
   * silently discarding one. Messaging for this state is #31.
   */
  it('fills nothing when two eligible findings claim the same domain', () => {
    const prefills = selectPrefills([
      finding({ rawText: 'AMS 4027' }),
      finding({ rawText: 'AMS 5659' }),
    ]);

    expect(prefills).toEqual([]);
  });

  it('does not let an ineligible finding create a conflict', () => {
    // The low-confidence duplicate never competed, so the good one still wins.
    const prefills = selectPrefills([
      finding({ rawText: 'AMS 4027' }),
      finding({ rawText: 'AMS 5659', confidence: 'low' }),
    ]);

    expect(prefills).toEqual([
      { domain: 'raw_material', specValue: 'AMS 4027', findingIndex: 0 },
    ]);
  });

  it('suppresses only the contested domain, not the whole read', () => {
    const prefills = selectPrefills([
      finding({ rawText: 'AMS 4027' }),
      finding({ rawText: 'AMS 5659' }),
      finding({ label: 'FINISH', rawText: 'ANODIZE', domain: 'coating' }),
    ]);

    expect(prefills).toEqual([
      { domain: 'coating', specValue: 'ANODIZE', findingIndex: 2 },
    ]);
  });

  /**
   * Two findings that read the same specification are not a disagreement.
   * Treating them as one avoids withholding a value the model was in fact
   * unanimous about.
   */
  it('treats identical readings of one domain as agreement, not conflict', () => {
    const prefills = selectPrefills([
      finding({ rawText: 'AMS 4027' }),
      finding({ rawText: '  AMS 4027 ' }),
    ]);

    expect(prefills).toEqual([
      { domain: 'raw_material', specValue: 'AMS 4027', findingIndex: 0 },
    ]);
  });

  it('reports the index of the finding it used, not its position among prefills', () => {
    const prefills = selectPrefills([
      finding({ confidence: 'low' }),
      finding({ label: 'FINISH', rawText: 'ANODIZE', domain: 'coating' }),
    ]);

    expect(prefills[0].findingIndex).toBe(1);
  });

  it('returns nothing for an empty read', () => {
    expect(selectPrefills([])).toEqual([]);
  });
});
