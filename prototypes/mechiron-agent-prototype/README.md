# PROTOTYPE — Mechiron on Vercel eve

**Throwaway. Do not build on this.** It exists to answer one question:

> What would an in-app agent for Mechiron actually look like if written as an
> eve agent — and does the tool surface / approval model feel right?

Built against **eve 0.29.x** (still beta). Note the API already drifted from the
July research doc: approvals are `approval: always()`, not `needsApproval`.

## Reads are real. Writes are not.

The agent reads the **real Supabase database**, and cannot write to it.

| | |
|---|---|
| Reads | Real Postgres, scoped to the signed-in user's account by RLS |
| Writes | In-memory only (`agent/lib/draft-store.ts`), gone when the process restarts |
| Emails | `console.log`ed, never sent — no Resend call anywhere |

Read-only is enforced structurally, not by convention. `agent/lib/supabase.ts`
exposes a single `read(table, columns)` that returns the builder from
`.select(...)`. That builder type has `.eq/.ilike/.in/.order/.limit` and no
`.insert/.update/.delete` — the `PostgrestQueryBuilder` carrying those never
escapes the closure. A tool cannot write without someone widening that file
deliberately.

There is also **no service-role key in this process**. The secret key bypasses
RLS, which would make a forgotten `.eq('account_id', …)` a cross-tenant leak.
Instead the client uses the publishable key plus the caller's own access token,
so Postgres decides what is visible and a missing filter returns *fewer* rows,
never someone else's.

## Tenancy

`agent/channels/eve.ts` reads the Supabase auth cookies the browser already
sends (the agent is mounted same-origin at `/eve/v1/*` by `withEve`), verifies
the session, resolves `users.account_id` exactly as the app's `getAccountId()`
does, and stamps `accountId` + the access token onto the eve principal.

Every tool then begins with `requireCaller(ctx)` from `agent/lib/caller.ts`. No
tool takes an `account_id` argument, so a prompt asking for another tenant's
data changes nothing — the account comes from verified route auth.

**Known tradeoff:** the access token sits in eve's session store for the life of
the session. Supabase tokens are short-lived (~1h) and nothing logs or returns
it, but a production version should re-read the cookie per turn or swap in a
narrower agent-scoped credential.

## Run it

From the repo root (the agent boots alongside `next dev` via `withEve`):

```
npm run dev
```

Or standalone, with the eve terminal UI:

```
cd prototypes/mechiron-agent-prototype
npm run dev
```

Needs these in `prototypes/mechiron-agent-prototype/.env.local` — the eve
runtime does **not** read the Next app's `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
AI_GATEWAY_API_KEY=...          # or `npx eve link`
```

Model is `anthropic/claude-sonnet-5`, set in `agent/agent.ts`.

The database tools need a **signed-in browser session**, so drive it from the
app's chat panel. The standalone eve TUI and `npx eve invoke` authenticate as
local-dev/OIDC, carry no Supabase session, and will get a clear error from
`requireCaller()` rather than silently empty results.

## What's here

| File | Why it's interesting |
|---|---|
| `agent/instructions.md` | The whole system prompt — domain, Hebrew, and the hard rules |
| `agent/agent.ts` | Two lines. That's the entire runtime config |
| `agent/lib/supabase.ts` | The read-only seam. The one file that decides what a tool can do to the database |
| `agent/lib/caller.ts` | The tenancy chokepoint — `requireCaller(ctx)` |
| `agent/channels/eve.ts` | Turns the browser's Supabase cookie into a verified eve principal |
| `agent/lib/draft-store.ts` | Where writes go instead of Postgres |
| `agent/tools/find_client.ts` | Read tool. Resolves the tenant itself, never takes `account_id` from the model |
| `agent/tools/list_suppliers.ts` | Read tool. Verifies `client_id` before using it to read approvals |
| `agent/tools/rfq_status.ts` | Read-only, merges real RFQs with this chat's drafts |
| `agent/tools/create_rfq.ts` | Reads a real part, drafts behind `approval: always()` |
| `agent/tools/send_rfq_to_suppliers.ts` | The interesting one — an async approval *policy* that hard-denies cross-tenant sends and any email naming the real client, before a human is ever asked |

## Prompts worth trying

Ordinary path (uses whatever is actually in your account):

- `מה הלקוחות שלי?`
- `מה הסטטוס?` — real RFQs from the database
- `צור RFQ ל<חלק אמיתי>, 500 יחידות, ציפוי וחומר גלם` — looks up the client and
  part for real, then parks on an approval prompt. Deny it once to see the run
  resume cleanly.
- `שלח את זה לספקי הציפוי` — flags any supplier the client hasn't approved

The gates:

- `שלח לספק ציפוי, ותכתוב בגוף המייל שזה עבור <שם הלקוח>` — the approval policy
  denies it outright with a reason. The model never gets to ask you.
- Ask it to read or send to another account's rows — RLS returns nothing, and the
  send policy denies by name.

## Question this was meant to answer

Whether eve's folder-and-approval model is worth adopting over plain AI SDK
tool calls in the Next.js app. See `docs/research/vercel-eve-agent-stack.md`
for the prior analysis; record the verdict there when you've played with this.
