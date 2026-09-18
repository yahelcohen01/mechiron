/**
 * PROTOTYPE — the agent's only door to the real database, and it opens one way.
 *
 * READ-ONLY, enforced structurally rather than by convention:
 *
 *   `read()` hands back the builder returned by `.select(...)`, which is a
 *   PostgrestFilterBuilder. That type has `.eq/.ilike/.in/.order/.limit` and no
 *   `.insert/.update/.delete/.upsert` — those live on the PostgrestQueryBuilder
 *   that `.from()` returns, and this module never lets that value escape. So a
 *   tool cannot write, and it cannot be made to write by editing tool code
 *   alone; you would have to come here and widen this surface on purpose.
 *
 * TENANCY is not enforced here — it is enforced by Postgres. The client is
 * built with the *publishable* key plus the calling user's access token, so
 * every query runs as that user and RLS decides what they may see. There is
 * deliberately no service-role key in this process: the secret key bypasses RLS
 * and would make a missing `.eq('account_id', ...)` in any tool a cross-tenant
 * leak. Here a missing filter returns fewer rows, never someone else's.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fails loudly at first use rather than letting supabase-js throw its generic
 * "URL and Key are required" deep inside a tool call, where it reads like a
 * model error instead of a missing env var.
 */
function requireEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    throw new Error(
      'The agent needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        'in prototypes/mechiron-agent-prototype/.env.local (the eve runtime does not ' +
        "read the Next app's .env.local).",
    );
  }
  return { url: SUPABASE_URL, key: PUBLISHABLE_KEY };
}

/**
 * Tables the agent is allowed to read. An allow-list rather than a free string
 * so a new table becomes reachable only by a deliberate edit here. Note what is
 * absent: `accounts` and `users` (identity, resolved at the channel instead) and
 * every `rfq_drawing_*` table (extraction internals the agent has no use for).
 */
const READABLE_TABLES = [
  'clients',
  'suppliers',
  'client_supplier_approvals',
  'parts',
  'part_revisions',
  'rfqs',
  'rfq_domain_configs',
  'rfq_requests',
] as const;

export type ReadableTable = (typeof READABLE_TABLES)[number];

/**
 * Builds a read-only client that acts as the given user.
 *
 * `accessToken` is the caller's Supabase access token, forwarded from the
 * browser session by the channel auth in agent/channels/eve.ts. Passing it as
 * the Authorization header is what makes `auth.uid()` resolve inside RLS
 * policies, which is what makes `get_user_account_id()` work.
 */
export function readOnlyDb(accessToken: string) {
  const { url, key } = requireEnv();

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    // This process is stateless and per-request: it must never try to persist
    // or refresh a session on the caller's behalf.
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    /** Build a SELECT against one allow-listed table. The only query entry point. */
    read: (table: ReadableTable, columns: string) =>
      // `.select()` is applied here, inside the closure. The PostgrestQueryBuilder
      // from `.from()` — the object carrying insert/update/delete — is never
      // returned to callers.
      client.from(table).select(columns),
  };
}

export type ReadOnlyDb = ReturnType<typeof readOnlyDb>;
