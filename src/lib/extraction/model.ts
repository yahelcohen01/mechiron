import { Output, generateText } from 'ai';
import { z } from 'zod';

import type { DrawingFile } from './types';
import { EXTRACTABLE_DOMAINS } from './types';

/**
 * The shape asked of the model.
 *
 * `'unknown'` is an explicit member of the enum rather than a nullable field:
 * structured-output modes across providers are markedly more reliable at
 * picking a listed option than at deciding to emit null, and abstention is the
 * answer this feature most needs to be reliable.
 */
const modelFindingSchema = z.object({
  label: z.string().nullable(),
  text: z.string(),
  confidence: z.enum(['high', 'low']),
  domain: z.enum([...EXTRACTABLE_DOMAINS, 'unknown']),
});

const modelResponseSchema = z.object({
  findings: z.array(modelFindingSchema),
});

export type ModelFinding = z.infer<typeof modelFindingSchema>;

export type ModelRequest = {
  model: string;
  prompt: string;
  file: Required<Pick<DrawingFile, 'bytes' | 'mediaType'>> &
    Pick<DrawingFile, 'filename'>;
};

export type ModelResponse = {
  findings: ModelFinding[];
  /** Kept whole for `rfq_drawing_extractions.raw_response`. */
  raw: unknown;
};

/**
 * The one place this feature talks to the network.
 *
 * Injected into `extractDrawingSpecs` so the CI lane can exercise the whole
 * pipeline offline without mocking modules. Model IDs are plain
 * `provider/model` strings resolved by Vercel AI Gateway, which needs
 * `AI_GATEWAY_API_KEY`.
 *
 * The PDF is sent whole and unmodified — no rasterising, no cropping, no
 * tiling. Measurement (PR #26) showed a direct read recovers small note text
 * character-exact, which is what removed the two-pass design this pipeline
 * originally had.
 */
export async function callGatewayModel(
  request: ModelRequest
): Promise<ModelResponse> {
  const { output, response } = await generateText({
    model: request.model,
    output: Output.object({ schema: modelResponseSchema }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: request.prompt },
          {
            type: 'file',
            mediaType: request.file.mediaType,
            data: request.file.bytes,
            filename: request.file.filename,
          },
        ],
      },
    ],
  });

  return { findings: output.findings, raw: response.body ?? output };
}
