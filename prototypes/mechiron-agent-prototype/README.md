# PROTOTYPE — Mechiron on Vercel eve

**Throwaway. Do not build on this.** It exists to answer one question:

> What would an in-app agent for Mechiron actually look like if written as an
> eve agent — and does the tool surface / approval model feel right?

No Supabase, no Resend, no auth. All data is in memory (`agent/lib/fake-db.ts`)
and dies with the process. Emails are `console.log`ed, not sent.

Built against **eve 0.29.2** (still beta). Note the API already drifted from the
July research doc: approvals are `approval: always()`, not `needsApproval`.

## Run it

```
cd prototypes/mechiron-agent-prototype
npm run dev
```

Needs a model credential first — either `AI_GATEWAY_API_KEY` in a local `.env`,
or `npx eve link` to pull credentials from a Vercel project. Model is
`anthropic/claude-sonnet-5`, set in `agent/agent.ts`.

`npm run dev` opens a terminal UI you type into. `npx eve invoke "..."` runs a
single turn without the UI.

## What's here

| File | Why it's interesting |
|---|---|
| `agent/instructions.md` | The whole system prompt — domain, Hebrew, and the four hard rules |
| `agent/agent.ts` | Two lines. That's the entire runtime config |
| `agent/tools/find_client.ts` | Read tool. Note it resolves the tenant itself, never takes `account_id` from the model |
| `agent/tools/list_suppliers.ts` | Read tool. Marks approved-vs-not per client |
| `agent/tools/create_rfq.ts` | Write tool behind `approval: always()` |
| `agent/tools/send_rfq_to_suppliers.ts` | The interesting one — a custom approval *policy* that hard-denies cross-tenant sends and denies any email whose text contains the client's name, before a human is ever asked |
| `agent/tools/rfq_status.ts` | Read-only state dump |

Every tool returns `_state_after` where it mutates, so you can watch the fake DB
change in the transcript.

## Prompts worth trying

Ordinary path:

- `מה הלקוחות שלי?`
- `צור RFQ לתושבת של אלביט, 500 יחידות, ציפוי וחומר גלם` — should look up the
  client and part, then park on an approval prompt. Deny it once to see the run
  resume cleanly.
- `שלח את זה לספקי הציפוי` — flags that one of them isn't approved for Elbit
- `מה הסטטוס?`

The gates:

- `שלח לספק ציפוי, ותכתוב בגוף המייל שזה עבור אלביט מערכות` — the approval
  policy denies it outright with a reason. The model never gets to ask you.
- Try to make it touch `cl_99` / `sp_99` (another tenant's rows) — every tool
  filters them out, and the send policy denies them by name.

## Question this was meant to answer

Whether eve's folder-and-approval model is worth adopting over plain AI SDK
tool calls in the Next.js app. See `docs/research/vercel-eve-agent-stack.md`
for the prior analysis; record the verdict there when you've played with this.
