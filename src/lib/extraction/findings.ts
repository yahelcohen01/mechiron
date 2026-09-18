import { silentLogger, type Logger } from '@/lib/logger';
import type { ModelFinding } from './model';
import type {
  DrawingFinding,
  ExtractableDomain,
  ExtractionContext,
  LearnedMapping,
} from './types';
import { EXTRACTABLE_DOMAINS } from './types';

const isExtractableDomain = (value: string): value is ExtractableDomain =>
  (EXTRACTABLE_DOMAINS as readonly string[]).includes(value);

/**
 * Uppercase, collapse runs of whitespace, drop a trailing period. Used for
 * comparison only — the value emitted is always the original text.
 */
const normalise = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').replace(/\.$/, '').toUpperCase();

/**
 * As above, but also strips punctuation, so `AMS-QQ-P-35` and `AMS QQ P 35`
 * compare equal. Standard designations are written with inconsistent
 * separators on real drawings, and the point of vocabulary reuse is to catch
 * exactly those near-misses.
 */
const normaliseLoosely = (value: string): string =>
  normalise(value).replace(/[^A-Z0-9]/g, '');

/**
 * Removes a label the model left on the front of the value despite being
 * asked not to: `MATERIAL: AL 6061 ...` -> `AL 6061 ...`.
 *
 * Only a short leading run before a colon or dash qualifies, so a specification
 * that legitimately contains punctuation is left intact.
 */
const LABEL_PREFIX = '([A-Za-z ֐-׿]{2,20})';
/**
 * A colon binds tightly (`MATERIAL: ...`); a dash only counts as a separator
 * when it has whitespace on both sides. Without that restriction the hyphens
 * inside standard designations qualify, and an unlabelled
 * `ANODIC PER MIL-PRF-8625` gets "helpfully" shortened to `PRF-8625`.
 */
const LABEL_SEPARATORS = [
  new RegExp(`^${LABEL_PREFIX}\\s*:\\s*([\\s\\S]+)$`),
  new RegExp(`^${LABEL_PREFIX}\\s+[—–-]\\s+([\\s\\S]+)$`),
];

const stripLeadingLabel = (text: string, label: string | null): string => {
  const trimmed = text.trim().replace(/\.$/, '');

  for (const separator of LABEL_SEPARATORS) {
    const match = trimmed.match(separator);
    if (!match) continue;

    const [, prefix, rest] = match;
    const looksLikeTheLabel =
      label !== null && normalise(prefix) === normalise(label);
    // `FINISH - PASSIVATION ...` appears on the samples with a dash and no
    // label field, so an unlabelled finding still gets the prefix removed
    // when the prefix is a plausible callout label rather than part of the
    // value.
    if (looksLikeTheLabel || label === null) return rest.trim();
    return trimmed;
  }

  return trimmed;
};

/**
 * The literal words that entitle a finding to a heat-treatment domain.
 *
 * This is enforced in code, not left to the prompt. Asked in words to classify
 * only on printed language, the model complies on some runs and not others: it
 * reads `HEAT TREAT TO H1025 PER AMS-H-6875` correctly, knows H1025 is an
 * age-hardening condition for 15-5PH, and supplies the inference the drawing
 * does not state. That is a *correct* piece of metallurgy producing exactly the
 * misclassification the over-abstaining design exists to prevent, and no
 * rewording reliably suppresses it.
 *
 * So the model's assignment is treated as a proposal and checked against the
 * text it claims to be reading. A proposal with no anchor becomes an
 * abstention, which the user can fix in one click — and once they do, the
 * learned mapping carries it thereafter. That is the designed route for the
 * hardening/quenching boundary anyway.
 *
 * The other three domains are unguarded: `raw_material`, `coating` and
 * `passivation` have no comparable trap, classified correctly on every run so
 * far, and have no short list of words that reliably appears in them.
 */
const DOMAIN_ANCHORS: Partial<Record<ExtractableDomain, RegExp>> = {
  hardening: /HARDEN/,
  quenching: /QUENCH|TEMPER/,
};

const hasAnchor = (domain: ExtractableDomain, text: string): boolean => {
  const anchor = DOMAIN_ANCHORS[domain];
  return anchor === undefined || anchor.test(normalise(text));
};

const findMapping = (
  text: string,
  mappings: LearnedMapping[]
): LearnedMapping | undefined => {
  const haystack = normalise(text);
  return mappings.find((mapping) => {
    const pattern = normalise(mapping.pattern);
    return pattern.length > 0 && haystack.includes(pattern);
  });
};

const matchVocabulary = (
  text: string,
  vocabulary: string[]
): string | undefined => {
  const target = normaliseLoosely(text);
  if (target.length === 0) return undefined;
  return vocabulary.find((value) => normaliseLoosely(value) === target);
};

/**
 * Turns what the model said into what the rest of the application consumes:
 * validated, label-stripped, reconciled against the account's own vocabulary,
 * and with learned mappings filling in where the model abstained.
 *
 * Learned mappings apply only to abstentions. The model saw the whole drawing
 * and a mapping did not; a mapping is a fallback for what the model could not
 * place, not an override of what it could.
 */
export function toDrawingFindings(
  modelFindings: ModelFinding[],
  context: ExtractionContext,
  log: Logger = silentLogger
): DrawingFinding[] {
  const findings: DrawingFinding[] = [];
  let dropped = 0;
  let guardOverrides = 0;
  let learnedAssignments = 0;
  let vocabularyReuses = 0;

  for (const [index, finding] of modelFindings.entries()) {
    const original = finding.text ?? '';
    const stripped = stripLeadingLabel(original, finding.label);

    if (stripped.length === 0) {
      dropped += 1;
      log.warn('finding.dropped', {
        index,
        reason: 'empty after label stripping',
        label: finding.label,
        originalLength: original.length,
      });
      continue;
    }

    if (stripped !== original.trim().replace(/\.$/, '')) {
      log.debug('finding.label_stripped', {
        index,
        label: finding.label,
        before: original,
        after: stripped,
      });
    }

    const vocabularyMatch = matchVocabulary(
      stripped,
      context.existingVocabulary
    );
    const rawText = vocabularyMatch ?? stripped;

    if (vocabularyMatch !== undefined && vocabularyMatch !== stripped) {
      vocabularyReuses += 1;
      log.info('finding.vocabulary_reused', { index });
      log.debug('finding.vocabulary_reused.detail', {
        index,
        read: stripped,
        reusedExisting: vocabularyMatch,
      });
    }

    // Anything that is not a domain this feature is allowed to assign —
    // including `subcontractor`, which the schema never offers but which a
    // model can still produce — becomes an abstention rather than an error.
    const proposed: ExtractableDomain | null = isExtractableDomain(
      finding.domain
    )
      ? finding.domain
      : null;

    if (finding.domain !== 'unknown' && proposed === null) {
      log.warn('finding.domain_not_permitted', {
        index,
        proposed: finding.domain,
      });
    }

    const anchored = proposed !== null && hasAnchor(proposed, rawText);
    let domain: ExtractableDomain | null = anchored ? proposed : null;
    let assignmentSource: DrawingFinding['assignmentSource'] =
      domain === null ? null : 'auto';

    if (proposed !== null && !anchored) {
      // The line worth watching. This fires when the model inferred a heat
      // treatment from a temper code or standard number instead of reading it
      // off the drawing — the failure that cost this ticket two eval cycles.
      guardOverrides += 1;
      log.info('finding.guard_override', {
        index,
        proposed,
        reason: 'no literal anchor word in the text',
      });
      log.debug('finding.guard_override.detail', { index, proposed, rawText });
    }

    if (domain === null) {
      const learned = findMapping(rawText, context.learnedMappings);
      if (learned) {
        domain = learned.domain;
        assignmentSource = 'learned';
        learnedAssignments += 1;
        log.info('finding.learned_mapping_applied', {
          index,
          domain: learned.domain,
          pattern: learned.pattern,
        });
      }
    }

    log.info('finding.classified', {
      index,
      domain,
      assignmentSource,
      confidence: finding.confidence,
      label: finding.label,
      textLength: rawText.length,
    });
    log.debug('finding.classified.detail', { index, rawText });

    findings.push({
      label: finding.label?.trim() || null,
      rawText,
      confidence: finding.confidence === 'low' ? 'low' : 'high',
      domain,
      assignmentSource,
    });
  }

  log.info('findings.summary', {
    returnedByModel: modelFindings.length,
    kept: findings.length,
    dropped,
    unassigned: findings.filter((finding) => finding.domain === null).length,
    lowConfidence: findings.filter((f) => f.confidence === 'low').length,
    guardOverrides,
    learnedAssignments,
    vocabularyReuses,
  });

  return findings;
}
