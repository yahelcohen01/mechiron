import { RFQ_DOMAINS, type RfqDomain } from '@/lib/types';

/**
 * The domains extraction is allowed to assign.
 *
 * `subcontractor` is excluded deliberately and permanently for v1: there is no
 * textual anchor for it on an engineering drawing, so a model asked to detect
 * it can only hallucinate one. It stays manually filled.
 */
export const EXTRACTABLE_DOMAINS = RFQ_DOMAINS.filter(
  (domain) => domain !== 'subcontractor'
) as readonly Exclude<RfqDomain, 'subcontractor'>[];

export type ExtractableDomain = (typeof EXTRACTABLE_DOMAINS)[number];

/**
 * How confident the model is that it read every *character* correctly.
 *
 * Tracked separately from the domain assignment on purpose: a line can be read
 * perfectly and still be unclassifiable, and a line can be classified
 * obviously and still be half-guessed pixels. A low-confidence finding must
 * never auto-fill a spec field no matter how confident its classification.
 */
export type FindingConfidence = 'high' | 'low';

/**
 * Where a finding's domain came from. Mirrors
 * `rfq_drawing_findings.assignment_source`, minus `'user'` — this module never
 * produces a user assignment, only the model (`auto`) or a previously taught
 * mapping (`learned`). `null` means the finding is unassigned.
 */
export type AssignmentSource = 'auto' | 'learned';

export type DrawingFinding = {
  /** The callout's label as printed, e.g. `MATERIAL`. Null if unlabelled. */
  label: string | null;
  /**
   * The specification verbatim in the drawing's language, with the leading
   * label stripped: `CRES ROD 15-5PH PER AMS 5659`, not `15-5PH` and not a
   * translation.
   */
  rawText: string;
  confidence: FindingConfidence;
  /** `null` = the model abstained, or a learned mapping did not cover it. */
  domain: ExtractableDomain | null;
  assignmentSource: AssignmentSource | null;
};

/**
 * One learned classification, scoped to an account. Assigning an unassigned
 * finding to a domain in the UI writes one of these (#17); they arrive here as
 * an input rather than being fetched, so this module stays free of the
 * database.
 */
export type LearnedMapping = {
  pattern: string;
  domain: ExtractableDomain;
};

/**
 * Everything the pipeline needs beyond the file itself.
 *
 * Both lists are *supplied by the caller*. This module never reads the
 * database — see the module docstring in `extract.ts` for why that boundary is
 * load-bearing.
 */
export type ExtractionContext = {
  learnedMappings: LearnedMapping[];
  /**
   * Spec values already in use across the account, feeding the RFQ page's
   * existing autocomplete. Where a reading matches one of these, the existing
   * string is emitted verbatim rather than a near-miss variant — a fragmented
   * vocabulary degrades that autocomplete over time.
   */
  existingVocabulary: string[];
  /**
   * False when the `008` tables are absent or unreadable. Extraction then
   * degrades to "found nothing" instead of erroring the RFQ page, and skips
   * the billed model call entirely: with nowhere to persist findings, reading
   * the drawing would cost money to produce a result that is dropped.
   */
  tablesAvailable: boolean;
};

export type ExtractionResult = {
  findings: DrawingFinding[];
  /** Null when no model call was made. */
  model: string | null;
  /** Whatever the model returned, for `rfq_drawing_extractions.raw_response`. */
  rawResponse: unknown;
};

export type DrawingFile = {
  bytes: Uint8Array;
  filename?: string;
  /** Defaults to `application/pdf`. */
  mediaType?: string;
};
