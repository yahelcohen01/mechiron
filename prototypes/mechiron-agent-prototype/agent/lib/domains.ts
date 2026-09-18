/**
 * PROTOTYPE — the six RFQ domains, mirroring src/lib/types/index.ts.
 *
 * Kept as a copy rather than an import because the eve runtime is a separate
 * package from the Next app and does not resolve its `@/*` alias. If the app
 * ever grows a seventh domain, migration 006's CHECK constraints and this file
 * both have to learn about it.
 */

export const RFQ_DOMAINS = [
  'raw_material',
  'coating',
  'passivation',
  'quenching',
  'hardening',
  'subcontractor',
] as const;

export type RfqDomain = (typeof RFQ_DOMAINS)[number];

export const DOMAIN_LABELS_HE: Record<RfqDomain, string> = {
  raw_material: 'חומר גלם',
  coating: 'ציפוי',
  passivation: 'פסיבציה',
  quenching: 'חישול',
  hardening: 'חיסום',
  subcontractor: 'קבלן משנה',
};

/** Hebrew label with a safe fallback for a value the DB has but this file doesn't. */
export function domainLabel(domain: string): string {
  return DOMAIN_LABELS_HE[domain as RfqDomain] ?? domain;
}
