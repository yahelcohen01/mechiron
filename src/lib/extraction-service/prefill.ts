import type { DrawingFinding, ExtractableDomain } from '@/lib/extraction/types';

/**
 * One domain spec field the extraction is allowed to fill in for the user.
 */
export type Prefill = {
  domain: ExtractableDomain;
  /** Written verbatim into `rfq_domain_configs.spec_value`. */
  specValue: string;
  /**
   * Position in the findings array this came from. Index rather than the
   * finding itself because the caller needs to mark exactly this row
   * `applied`, and two findings can be textually identical.
   */
  findingIndex: number;
};

/**
 * Decides which findings are allowed to type themselves into a spec field.
 *
 * Pure, and deliberately so — this is the trust boundary of the whole
 * feature. A value that appears in a field the user will send to a supplier
 * has to clear a rule that can be stated, read, and tested without a database
 * or a model call.
 *
 * Two conditions, and both are load-bearing:
 *
 * 1. **High confidence *and* a domain.** `DrawingFinding` carries these as
 *    separate fields because they fail separately: a line can be read
 *    perfectly and still be unclassifiable, and a line can be classified
 *    obviously and still be half-guessed pixels. Either failure disqualifies
 *    it.
 *
 * 2. **Exactly one claimant per domain.** `rfq_domain_configs` is
 *    UNIQUE (rfq_id, domain), so only one value can win, and two equally
 *    confident readings cannot be honestly ranked — model output order is not
 *    a ranking. A contested domain is left empty and *none* of its findings
 *    are marked applied, which is what carries them into the
 *    unassigned-findings card (#16) rather than silently discarding the
 *    loser. Telling the user this happened is #31.
 *
 * Findings that read the same text are not a disagreement, and are collapsed
 * before the conflict rule sees them.
 */
export function selectPrefills(findings: readonly DrawingFinding[]): Prefill[] {
  const claimants = new Map<ExtractableDomain, Prefill[]>();

  findings.forEach((finding, findingIndex) => {
    if (finding.confidence !== 'high') return;
    if (finding.domain === null) return;

    const specValue = finding.rawText.trim();
    if (specValue.length === 0) return;

    const existing = claimants.get(finding.domain) ?? [];
    existing.push({ domain: finding.domain, specValue, findingIndex });
    claimants.set(finding.domain, existing);
  });

  const prefills: Prefill[] = [];

  for (const candidates of claimants.values()) {
    const distinctValues = new Set(candidates.map((c) => c.specValue));
    if (distinctValues.size !== 1) continue;

    // Unanimous. The first reading carries the mark; any duplicates of it stay
    // unapplied, which is accurate — they filled nothing.
    prefills.push(candidates[0]);
  }

  return prefills;
}
