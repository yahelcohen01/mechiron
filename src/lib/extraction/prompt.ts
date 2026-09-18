import type { ExtractionContext } from './types';
import { EXTRACTABLE_DOMAINS } from './types';

/**
 * Assembles the single instruction sent with the drawing.
 *
 * The wording here is expected to change as classification is tuned — no test
 * asserts it. What tests do assert is that the caller's mappings and
 * vocabulary end up inside the returned string, because losing that wiring is
 * silent and expensive.
 *
 * The abstention rules are deliberately over-strict. The hardening/quenching
 * boundary could not be specified up front, and an abstention costs the user
 * one click whereas a misclassification costs an email to the wrong category
 * of supplier. Learned mappings close the gap over time, taught by use rather
 * than by guessing the rule in advance.
 */
export function buildExtractionPrompt(context: ExtractionContext): string {
  const sections = [
    `You are reading a manufacturing engineering drawing. Transcribe every specification callout in the notes and title blocks, then classify each one.

Return one entry per specification you find. Do not invent entries; if the drawing carries no specification callouts, return none.

COMPLETENESS
- Return every callout that names a material, a finish, a coating, a chemical treatment, or a heat, bake, or cure process — including ones you will end up marking "unknown". Return it even if it is a process instruction rather than a named standard, and even if it also states a time, temperature, or sequence.
- Never omit a callout because you could not classify it. A specification you return and mark "unknown" is shown to the user for one click; a specification you leave out is lost silently. Omitting is the worse error.
- Do not merge two separate callouts into one entry, and do not split one callout across two.

TRANSCRIPTION
- Transcribe the value exactly as printed, character for character, in the drawing's own language. Do not translate, expand, normalise, or tidy a standard designation.
- Put the printed label (for example MATERIAL, FINISH) in "label", and the specification itself in "text" with the label and any trailing period removed. "MATERIAL: CRES ROD 15-5PH PER AMS 5659." yields label "MATERIAL" and text "CRES ROD 15-5PH PER AMS 5659".
- Keep the full specification including its standard reference. "15-5PH" alone is not enough for a supplier to quote against.
- Set "confidence" to "low" if you are unsure of even a single character. This is about reading the pixels, not about the classification.

CLASSIFICATION
Assign each specification to exactly one of these domains, or to "unknown":
${EXTRACTABLE_DOMAINS.map((domain) => `- ${domain}`).join('\n')}

Rules, in order:
- Judge only on words literally printed in the text. Never infer a domain from what a standard number, class, temper code, or material condition designation means. You may know that a condition code implies a particular heat treatment; that knowledge is not admissible here.
- "quenching" only when the word quench or temper literally appears.
- "hardening" only when the word harden, age-harden, or case-harden literally appears.
- "unknown" for every other heat-treatment callout. That includes a bare "HEAT TREAT", "HEAT TREAT TO <code>", "HEAT TREAT PER <standard>", and bake, stress-relief, or solution-treat callouts. Do not choose between hardening and quenching on wording that does not contain the words above.
- "unknown" whenever you are not confident of the domain.
- Never assign "subcontractor". It is not detectable from a drawing.

Abstaining is the correct answer when the drawing is ambiguous. A wrong domain sends the specification to the wrong supplier; an abstention only asks the user to click.`,
  ];

  if (context.learnedMappings.length > 0) {
    sections.push(
      `PREVIOUSLY TAUGHT CLASSIFICATIONS
This account has already classified the specifications below. When a specification you read contains one of these patterns, use the domain given here instead of abstaining.
${context.learnedMappings
  .map((mapping) => `- "${mapping.pattern}" -> ${mapping.domain}`)
  .join('\n')}`
    );
  }

  if (context.existingVocabulary.length > 0) {
    sections.push(
      `EXISTING SPECIFICATION VOCABULARY
This account already uses the exact strings below. If a specification you read is the same specification as one of these, emit that existing string character for character rather than your own variant of it. If it is a different specification, transcribe what you see.
${context.existingVocabulary.map((value) => `- ${value}`).join('\n')}`
    );
  }

  return sections.join('\n\n');
}
