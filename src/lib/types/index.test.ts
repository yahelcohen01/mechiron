import { describe, expect, it } from 'vitest';

import {
  DOMAIN_LABELS_HE,
  RFQ_DOMAINS,
  SPEC_LABELS_HE,
  defaultSubject,
  formatRevision,
  getQuantity,
} from '@/lib/types';

describe('formatRevision', () => {
  it('pads single-digit revisions to two characters', () => {
    expect(formatRevision(0)).toBe('00');
    expect(formatRevision(3)).toBe('03');
  });

  it('leaves revisions that are already two digits alone', () => {
    expect(formatRevision(12)).toBe('12');
  });

  it('does not truncate revisions past 99', () => {
    expect(formatRevision(100)).toBe('100');
  });
});

describe('getQuantity', () => {
  it('falls back to the base quantity when there is no domain config', () => {
    expect(getQuantity(50)).toBe(50);
  });

  it('falls back to the base quantity when the override is null', () => {
    expect(getQuantity(50, { quantity_override: null })).toBe(50);
  });

  it('prefers the override when one is set', () => {
    expect(getQuantity(50, { quantity_override: 20 })).toBe(20);
  });

  it('treats an override of zero as a real override, not as absent', () => {
    // Guards against `||` creeping in where `??` is required: a zero-quantity
    // domain must not silently inherit the RFQ's base quantity.
    expect(getQuantity(50, { quantity_override: 0 })).toBe(0);
  });
});

describe('defaultSubject', () => {
  it('carries the part number and the padded revision', () => {
    const subject = defaultSubject('P-1234', 7, 'raw_material');

    expect(subject).toContain('P-1234');
    expect(subject).toContain('07');
  });

  it('names the domain in Hebrew', () => {
    expect(defaultSubject('P-1234', 7, 'coating')).toContain(
      DOMAIN_LABELS_HE.coating
    );
    expect(defaultSubject('P-1234', 7, 'passivation')).toContain(
      DOMAIN_LABELS_HE.passivation
    );
  });

  it('builds a distinct subject for every domain', () => {
    const subjects = RFQ_DOMAINS.map((domain) =>
      defaultSubject('P-1234', 1, domain)
    );

    expect(new Set(subjects).size).toBe(RFQ_DOMAINS.length);
  });
});

describe('domain label maps', () => {
  // Supplier-facing UI reads these by domain key; a missing entry renders
  // as an empty label rather than failing loudly, so assert coverage here.
  it('labels every domain in both maps', () => {
    for (const domain of RFQ_DOMAINS) {
      expect(DOMAIN_LABELS_HE[domain], `DOMAIN_LABELS_HE.${domain}`).toBeTruthy();
      expect(SPEC_LABELS_HE[domain], `SPEC_LABELS_HE.${domain}`).toBeTruthy();
    }
  });

  it('has no extra keys beyond the declared domains', () => {
    expect(Object.keys(DOMAIN_LABELS_HE).sort()).toEqual([...RFQ_DOMAINS].sort());
    expect(Object.keys(SPEC_LABELS_HE).sort()).toEqual([...RFQ_DOMAINS].sort());
  });
});
