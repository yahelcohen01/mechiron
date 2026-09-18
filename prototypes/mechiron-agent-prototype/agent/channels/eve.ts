import { eveChannel } from 'eve/channels/eve';
import {
  localDev,
  placeholderAuth,
  vercelOidc,
  type AuthFn,
} from 'eve/channels/auth';
import { createServerClient } from '@supabase/ssr';
import {
  ACCESS_TOKEN_ATTRIBUTE,
  ACCOUNT_ID_ATTRIBUTE,
} from '../lib/caller.js';

/**
 * PROTOTYPE — authenticate the browser's Supabase session.
 *
 * The agent is mounted at /eve/v1/* on the Next app's own origin (see
 * withEve in next.config.ts), so the browser sends the app's `sb-*` auth
 * cookies along with every agent request without the UI doing anything. This
 * AuthFn reads them, verifies the session against Supabase, resolves the
 * tenant the same way the app does, and stamps both onto the principal.
 *
 * Two things end up in `attributes`, and they play different roles:
 *
 *   accountId  — routing fact. Tools use it to scope and to write demo rows.
 *   token      — the caller's access token, forwarded so each tool's queries
 *                run *as that user* and RLS enforces tenancy in Postgres.
 *
 * TRADEOFF worth knowing before this pattern outlives the prototype: putting
 * the access token in session attributes means it is at rest in eve's session
 * store for the life of the session. Supabase access tokens are short-lived
 * (~1h), which caps the exposure, and nothing here logs it or returns it to the
 * model. A production version should either re-read the cookie per turn or
 * exchange it for a narrower, agent-scoped credential.
 */

/** Parses a `Cookie:` header into the shape @supabase/ssr expects. */
function parseCookieHeader(header: string | null) {
  if (!header) return [];

  return header
    .split(';')
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return null;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name === '') return null;
      // @supabase/ssr writes the chunked/base64 encoding itself; only the
      // percent-encoding applied by the browser is ours to undo.
      return { name, value: decodeURIComponent(value) };
    })
    .filter((c): c is { name: string; value: string } => c !== null);
}

function supabaseSessionAuth(): AuthFn<Request> {
  return async (request) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    // Skip to the next entry in the walk rather than throwing: without these
    // the prototype should still run for the TUI and on localhost.
    if (!url || !key) return null;

    const cookies = parseCookieHeader(request.headers.get('cookie'));
    if (cookies.length === 0) return null;

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookies,
        // Read-only path: this handler must never mint or rotate cookies,
        // and it has no response to attach them to.
        setAll: () => {},
      },
    });

    // getClaims() verifies the JWT rather than trusting the cookie's contents.
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) return null;

    // Same lookup as the app's getAccountId(). A user with no row here is not
    // a Mechiron user, whatever their Supabase session says.
    const { data: user, error } = await supabase
      .from('users')
      .select('account_id')
      .eq('id', userId)
      .single();

    if (error || !user?.account_id) return null;

    return {
      authenticator: 'supabase-session',
      issuer: url,
      principalId: userId,
      principalType: 'user',
      subject: userId,
      attributes: {
        [ACCOUNT_ID_ATTRIBUTE]: user.account_id as string,
        [ACCESS_TOKEN_ATTRIBUTE]: accessToken,
      },
    };
  };
}

export default eveChannel({
  auth: [
    // First: a real signed-in app user. This is the only entry that yields a
    // principal the database tools accept — the rest authenticate the caller
    // but carry no Supabase session, so requireCaller() rejects them.
    supabaseSessionAuth(),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Still the production tripwire: this prototype cannot ship open.
    placeholderAuth(),
  ],
});
