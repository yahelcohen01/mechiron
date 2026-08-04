/**
 * Drawing auto-detection: read an engineering drawing and classify the
 * specification callouts on it into RFQ domains.
 *
 * Spec: `docs/development/drawing-auto-detection/README.md`.
 *
 * The public surface is deliberately one function. See `extract.ts`.
 */
export {
  DEFAULT_EXTRACTION_MODEL,
  extractDrawingSpecs,
  type ExtractOptions,
  type ModelCall,
} from './extract';
export type { ModelFinding, ModelRequest, ModelResponse } from './model';
export {
  EXTRACTABLE_DOMAINS,
  type AssignmentSource,
  type DrawingFile,
  type DrawingFinding,
  type ExtractableDomain,
  type ExtractionContext,
  type ExtractionResult,
  type FindingConfidence,
  type LearnedMapping,
} from './types';
