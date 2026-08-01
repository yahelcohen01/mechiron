# PROTOTYPE — sliding agent chat

**Throwaway. Delete this whole folder once a variant wins.**

> Three variants of the sliding agent chat, switchable via `?agent=A|B|C`,
> mounted in the existing `(dashboard)` layout so it pushes the real sidebar
> and page content aside.

## Run it

`npm run dev`, then any dashboard page. A dark "עוזר / Assistant" pill sits in
the bottom corner — click it or press **⌘K**. **Esc** closes.

The floating black bar at the bottom-centre switches variants; **←/→** also
cycle (ignored while typing). The bar is dev-only.

It also has a **live / mock** toggle. `live` (default) talks to the real eve
agent; `mock` (`?mock=1`) falls back to the scripted stream, so the layout is
still judgeable with the agent down or no model credential configured.

## The slide

The panel always occupies the **logical end** side, opposite the nav sidebar:

| Locale | Panel enters from | Shell pushed |
|---|---|---|
| Hebrew (RTL) | left | right |
| English (LTR) | right | left |

Switch language in Settings → System to check both. The mechanic is in
`agent-chat-shell.tsx`: the panel is parked off-screen at
`inset-inline-end: -420px` and slides in, while the shell gets a matching
`padding-inline-end`. The shell **reflows** into the narrower space rather than
translating out of the viewport — tables and filters shrink instead of falling
off the edge.

Below ~840px there isn't 420px to spare, so the panel overlays and the shell is
left alone.

## Variants

| Key | Name | The bet it makes |
|---|---|---|
| **A** | Bubbles | Conversation is the object. Tool calls shrink to pills you can expand; approval is an inline card in the flow. Familiar, low-friction, and hides the machinery. |
| **B** | Work log | It isn't a chat, it's an audit trail. Flat gutter-rail timeline, tool I/O visible by default, monospace throughout. Treats "what did the agent do to my data" as the primary question. |
| **C** | Command bar | Action-first. Input pinned at the **top**, current turn as one big card, history collapsed to a strip. A pending approval **takes over the panel** — you can't scroll past a decision. |

The interesting disagreement between them is **how much of the agent's
machinery a procurement user should see**, and **how hard an approval is to
ignore**. A hides it, B shows everything, C blocks on it.

## Live mode — the real agent

`use-eve-chat.ts` wraps eve's `useEveAgent` and projects its UIMessage-shaped
state onto the same `ChatController` the mock returns, so **the variants don't
know which backend they're on**. Swapping backends touches one line in
`agent-chat-shell.tsx`.

Wiring, in two places outside this folder:

- `next.config.ts` — `withEve(nextConfig, { eveRoot: "./prototypes/mechiron-agent-prototype" })`.
  This mounts the agent on this app's origin at `/eve/v1/*` (so no CORS and no
  proxy route) and boots the eve dev server alongside `next dev`. Look for
  `[eve:dev] server listening at …` in the dev output.
- `package.json` — the `eve` dependency.

What the adapter maps:

| eve | prototype |
|---|---|
| `text` / `reasoning` parts | text part (reasoning is rendered as plain text — nowhere better to put it) |
| `dynamic-tool` in `input-*` / `output-*` state | tool part, running → done |
| `toolMetadata.eve.inputRequest` | approval part; answered with `send({ inputResponses })` |
| `output-denied` / `approval.approved === false` | approval part marked denied, no tool row |
| `status === 'error'` | a trailing `⚠` message |

Two sharp edges worth knowing:

- The agent may answer an approval-shaped moment with the built-in
  `ask_question` tool instead of a gated `create_rfq` call. Both arrive as
  `input.requested`, so both render as approval cards — but `ask_question`
  carries **the model's own option ids** (`yes`/`no`, …), not `approve`/`deny`.
  `pickOptionIds()` matches known ids and falls back to position for a
  two-option prompt. A prompt with three or more options will render as a
  binary approve/deny, which is wrong — the variants would need real option
  buttons to handle that.
- Detail rows come from the tool input. For `ask_question` that input is just
  the prompt/options envelope, so those rows are suppressed.

## Mock mode

`use-fake-agent-stream.ts` replays **pre-recorded runs** — no model, no network,
no DB. It streams text word-by-word, runs tool calls, and parks on a
`create_rfq` approval so all three variants can be judged on identical content.

`pickScript()` routes your message to one of four canned runs by keyword. It is
a lookup table, not intent detection — anything it doesn't recognise gets a
reply saying so.

| You type | You get |
|---|---|
| `היי` / `שלום` / `hi` (the whole message) | plain greeting, no tools |
| anything with `הצעת מחיר` / `צור` / `rfq` / `create` | the full RFQ run + approval gate |
| anything with `סטטוס` / `status` | short read-only status run |
| anything else | "this is a prototype" fallback |

The script mirrors the real agent, so switching live↔mock mid-conversation is a
fair comparison of the same content.

## When a variant wins

Fold it into real code properly (this was written with no tests and no error
handling), then remove:

- the `AgentChatShellPROTOTYPE` wrapper and `Suspense` from `src/app/(dashboard)/layout.tsx`
- `src/components/prototype/`
- the `withEve()` wrapper in `next.config.ts` and the `eve` dependency, unless
  the decision is to keep building on eve

Nothing here is production-shaped. In particular the agent's tools run against
an in-memory fake DB with a hardcoded `account_id` — there is **no tenant
isolation and no auth** on the agent side yet. See the tenancy notes in
`prototypes/mechiron-agent-prototype/agent/lib/fake-db.ts`.
