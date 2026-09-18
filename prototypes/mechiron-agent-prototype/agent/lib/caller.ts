/**
 * PROTOTYPE — who is asking, and what may they read.
 *
 * This is the seam the whole tenancy story hangs on. Every tool starts by
 * calling `requireCaller(ctx)` and uses the `db` it returns; no tool builds its
 * own client, and no tool ever accepts an `account_id` as a model-supplied
 * argument. The account comes from verified route auth (agent/channels/eve.ts),
 * so a prompt that says "show me account X's clients" changes nothing.
 *
 * If you later want to run the agent without a browser session (a cron job, an
 * eval), give it its own AuthFn that stamps the same attributes — do not add an
 * `accountId` parameter to a tool.
 */

import type { SessionContext } from 'eve/context';
import { readOnlyDb, type ReadOnlyDb } from './supabase.js';

/** Attribute names stamped onto the principal by the channel's AuthFn. */
export const ACCOUNT_ID_ATTRIBUTE = 'accountId';
export const ACCESS_TOKEN_ATTRIBUTE = 'supabaseAccessToken';

export type Caller = {
  /** The tenant, resolved from `users.account_id` at authentication time. */
  accountId: string;
  /** Supabase Auth user id (`auth.uid()` inside RLS policies). */
  userId: string;
  /** Read-only, RLS-scoped database handle for this caller. */
  db: ReadOnlyDb;
};

function readAttribute(
  attributes: Readonly<Record<string, string | readonly string[]>> | undefined,
  name: string,
): string | undefined {
  const value = attributes?.[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Resolves the authenticated caller, or throws.
 *
 * Throwing (rather than returning an empty result) is deliberate: an
 * unauthenticated turn should surface as a visible failure in the transcript,
 * not as an agent that cheerfully reports "you have no clients".
 */
export function requireCaller(ctx: SessionContext): Caller {
  const current = ctx.session.auth.current;

  const accountId = readAttribute(current?.attributes, ACCOUNT_ID_ATTRIBUTE);
  const accessToken = readAttribute(current?.attributes, ACCESS_TOKEN_ATTRIBUTE);

  if (current?.principalType !== 'user' || !accountId || !accessToken) {
    throw new Error(
      'This tool needs a signed-in Mechiron user. Open the chat from the app ' +
        'while logged in — the eve TUI and OIDC callers have no Supabase session.',
    );
  }

  return {
    accountId,
    userId: current.principalId,
    db: readOnlyDb(accessToken),
  };
}
