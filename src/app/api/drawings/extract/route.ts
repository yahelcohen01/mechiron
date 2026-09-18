import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { getAccountId } from '@/lib/supabase/account';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import {
  EXTRACTION_SERVICE_LOG_SCOPE,
  MAX_UPLOAD_BYTES,
  createSupabasePorts,
  isAcceptedMediaType,
  runDrawingExtraction,
} from '@/lib/extraction-service';

/**
 * `POST /api/drawings/extract` — read a drawing the user has just picked.
 *
 * **A Route Handler rather than a Server Action, deliberately.** Next.js caps
 * server-action request bodies at 1 MB by default and `next.config.ts` sets no
 * `bodySizeLimit`; a drawing would fail with an error that says nothing useful
 * about why. Route handlers have no such cap, so this endpoint sets and
 * enforces its own.
 *
 * **It persists nothing.** No storage object, no database row. Findings are
 * returned in the same response and live in the form's client state until
 * submit, so abandoning the form leaves nothing behind.
 *
 * Status codes distinguish three different things, because the browser treats
 * them differently:
 *   - `4xx` — the request was refused (unauthenticated, no file, wrong type,
 *     over the ceiling). Something to tell the user to fix.
 *   - `200` — a real answer: `completed`, or `skipped` with a reason. A skip
 *     is not an error; the form stays exactly as usable as it is today.
 *   - `502` — the read itself failed. Offer a retry. Kept distinct from a
 *     `completed` read with no findings, which means the drawing genuinely
 *     carries no specifications.
 */

// Explicit rather than inherited: this handler needs `node:crypto` for the
// cache hash and holds the request open for the length of a model call.
export const runtime = 'nodejs';

// A single-pass read measures under 5s; 60 leaves room for a cold gateway and
// the one automatic retry, while still failing rather than hanging.
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const log = createLogger({ scope: EXTRACTION_SERVICE_LOG_SCOPE });

  let accountId: string;
  try {
    accountId = await getAccountId();
  } catch {
    return NextResponse.json(
      { error: 'לא מחובר', code: 'unauthenticated' },
      { status: 401 }
    );
  }

  // Refuse an oversized body before buffering it. `Content-Length` is a hint
  // from the client and is re-checked against the real bytes below; catching
  // it here just avoids reading 100 MB into memory to then reject it.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return tooLarge();
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'בקשה לא תקינה', code: 'malformed-request' },
      { status: 400 }
    );
  }

  const clientId = form.get('client_id');
  if (typeof clientId !== 'string' || clientId.length === 0) {
    return NextResponse.json(
      { error: 'יש לבחור לקוח', code: 'missing-client' },
      { status: 400 }
    );
  }

  const drawing = form.get('drawing');
  if (!(drawing instanceof File) || drawing.size === 0) {
    return NextResponse.json(
      { error: 'לא נבחר קובץ', code: 'missing-file' },
      { status: 400 }
    );
  }

  if (drawing.size > MAX_UPLOAD_BYTES) {
    return tooLarge();
  }

  // The form accepts PNG and JPEG as well as PDF, and the pipeline defaults an
  // absent media type to `application/pdf`. Passing the real one through is
  // what stops a PNG being announced to the model as a PDF.
  if (!isAcceptedMediaType(drawing.type)) {
    return NextResponse.json(
      { error: 'סוג קובץ לא נתמך. יש להעלות PDF, PNG או JPEG', code: 'unsupported-type' },
      { status: 415 }
    );
  }

  const bytes = new Uint8Array(await drawing.arrayBuffer());
  const supabase = await createSupabaseClient();

  const outcome = await runDrawingExtraction(
    {
      accountId,
      clientId,
      file: {
        bytes,
        mediaType: drawing.type,
        filename: drawing.name,
      },
    },
    createSupabasePorts(supabase, accountId, log),
    { logger: log }
  );

  if (outcome.status === 'failed') {
    // The gateway's own message stays in the server log. The spec is explicit
    // that raw errors are never surfaced — they leak model ids, provider names
    // and occasionally request contents into a customer's browser.
    log.error('response.failed', { error: outcome.message });
    return NextResponse.json(
      { status: 'failed', error: 'קריאת השרטוט נכשלה', code: 'read-failed' },
      { status: 502 }
    );
  }

  return NextResponse.json(outcome, { status: 200 });
}

function tooLarge(): NextResponse {
  return NextResponse.json(
    {
      error: 'גודל הקובץ חורג מ-25MB',
      code: 'file-too-large',
      limitBytes: MAX_UPLOAD_BYTES,
    },
    { status: 413 }
  );
}
