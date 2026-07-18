# Vercel Eve & the Vercel "Agent Stack" — Research for Mechiron

> Research date: 2026-07-18. Investigated against primary sources (Vercel docs, the `vercel/eve` GitHub repo, npm, official blog/changelog, AI SDK docs). The user learned about Eve from two sponsored YouTube videos; this report deliberately verifies the hype against sources and flags what could **not** be verified.

## TL;DR / Recommendation

- **Do not build Mechiron's customer-facing agent on Eve right now.** Eve is officially **beta / public preview** (Vercel's own words), pre-1.0, and changing weekly — the wrong foundation for a production RFQ app. [docs](https://vercel.com/docs/eve), [changelog](https://vercel.com/changelog/introducing-eve-an-open-source-agent-framework)
- **The mature, GA path is the Vercel AI SDK** (v7, stable) used directly inside your existing Next.js 16 app: `generateText`/`streamText` with `tools`. It composes with your existing Supabase server actions and is not Vercel-locked. This is the recommended minimum viable stack. [AI SDK](https://ai-sdk.dev/docs/introduction)
- **Your use case is CRUD-over-tools, not code execution.** The demos' "wow" features — the Sandbox (arbitrary Python/bash microVMs) and sub-agents — are irrelevant to "create an RFQ / add a client / send an email." Adopting Eve mostly buys you machinery you won't use. [Sandbox docs](https://vercel.com/docs/sandbox/pricing)
- **The one genuinely valuable idea to steal from Eve is human-in-the-loop approval gates** for risky mutations (send email, create RFQ). You can implement this yourself with the AI SDK's tool-call interruption pattern; you don't need Eve's runtime for it. [Eve tools](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)
- **Multi-tenancy is a real concern either way.** Whatever runs the agent tools must enforce your `account_id` boundary; an agent tool that calls Supabase with elevated context can bypass RLS. Keep tools thin wrappers over your existing account-scoped server actions.
- **Revisit Eve after it hits GA** if you later want Slack/Teams channels, durable long-running multi-step jobs, or scheduled agents. For a chat box that performs a handful of scoped actions, it is overkill today.

---

## Maturity Verdict (read this first)

| Axis | Finding | Source |
|---|---|---|
| **Status** | **Beta / "public preview."** Docs banner: *"eve is currently in beta and subject to the Vercel beta terms; the framework, APIs, documentation, and behavior may change before general availability."* | [vercel.com/docs/eve](https://vercel.com/docs/eve), [blog](https://vercel.com/blog/introducing-eve) |
| **Announced** | June 17, 2026 — *"the public preview is open today."* ~1 month old at time of research. | [blog](https://vercel.com/blog/introducing-eve), [changelog](https://vercel.com/changelog/introducing-eve-an-open-source-agent-framework) |
| **npm version** | `eve` **0.25.1** (latest), published **2026-07-17**; beta tag `0.6.0-beta.20`. **108 published versions**, still 0.x. Very high release velocity → breaking-change risk. | npm registry (`registry.npmjs.org/eve`) |
| **License** | **Apache-2.0** (genuinely open source). | [package.json](https://github.com/vercel/eve/blob/main/packages/eve/package.json) |
| **Runtime reqs** | Node **>= 24**; single runtime dep is **Nitro** (`nitro@3.0.260610-beta`). | package.json |
| **Production-recommended by Vercel?** | The *marketing* says "production comes built in"; the *docs* explicitly warn it may change before GA. Treat as **not production-ready** for a paid, multi-tenant app. | blog vs. docs banner |

**Skeptic's note:** the version numbering is inconsistent (`latest` = 0.25.1 while the `beta` dist-tag is 0.6.0-beta.20). Regardless of the exact number, this is pre-1.0 software one month past announcement. That is the single most important fact for a production decision.

---

## 1. What Eve actually is

Eve is *"a filesystem-first framework for durable backend AI agents. You define each agent with files under an `agent/` directory. eve discovers those files and compiles them into an app that runs on Vercel Functions."* ([docs](https://vercel.com/docs/eve))

**"Agent as a folder"** — capabilities are auto-discovered by conventional file/dir names under `agent/` ([concepts](https://vercel.com/docs/eve/concepts)):

| Path | What it is | Required? |
|---|---|---|
| `agent/instructions.md` | always-on system prompt | **Required** |
| `agent/agent.ts` | runtime config via `defineAgent({ model })` | **Required** |
| `agent/tools/*.ts` | one typed tool per file (`defineTool`); filename = tool name | optional |
| `agent/skills/*` | on-demand procedures/knowledge loaded only when relevant | optional |
| `agent/subagents/*` | child agents for delegated subtasks | optional |
| `agent/channels/*` | entry points: HTTP, Slack, etc. | optional |
| `agent/connections/*` | typed integrations with external services | optional |
| `agent/sandbox/*` | isolated bash-style compute environment | optional |
| `agent/schedules/*` | cron jobs (mentioned in marketing; feature dir) | optional |
| `agent/instrumentation.ts` | optional OpenTelemetry setup | optional |

A **minimal agent is two files** (`instructions.md` + `agent.ts`). The **compilation step**: eve "discovers those files, validates them, compiles a manifest, and serves the runtime as a deployable app" ([concepts](https://vercel.com/docs/eve/concepts)). It exposes HTTP routes like `POST /eve/v1/session` and a stream endpoint; sessions are durable and stream NDJSON lifecycle events.

Underneath, Eve is a thin orchestration layer wiring together several **existing Vercel products** (verified in [docs](https://vercel.com/docs/eve)):
- **Vercel Workflows** → persist session state, resume interrupted work
- **Vercel Sandbox** → isolate code execution
- **AI Gateway** → route model requests, provider fallbacks
- **Vercel Connect** → OAuth tokens / API keys for external services
- **Vercel Observability** → "Agent Runs" dashboard
- **AI SDK** (underneath) → the actual model calls / tool loop

---

## 2. The agent-stack pieces

| Piece | What it does | Maturity | Required with Eve? | Separate GA product? |
|---|---|---|---|---|
| **AI SDK** | TypeScript toolkit; `generateText`/`streamText` + `tools`. The actual LLM/tool loop. | **GA — v7 stable** ([ai-sdk.dev](https://ai-sdk.dev/docs/introduction)) | Yes (foundation) | **Yes, GA & standalone** |
| **AI Gateway** | Resolves model strings (`openai/gpt-5.4-mini`), provider fallback, BYOK. | GA | Used by Eve for model access, but a model can be called directly too | Yes, GA |
| **Vercel Sandbox** | Ephemeral microVMs for untrusted/model-generated bash & code. | GA product; **`iad1` region only** | Optional — only if a tool runs sandboxed code | Yes, GA |
| **Vercel Workflows** | Durable execution engine; `'use workflow'` / `'use step'`; builds on open-source [Workflow SDK](https://workflow-sdk.dev). Powers Eve's durable sessions. | GA-ish product; **SDK still 5.0.0-beta.x** for some features (multi-region) | Yes — Eve durability is built on it | Yes, sold as its own product |
| **Fluid Compute** | Function model that keeps a long-running/streaming invocation efficient; **default on for new projects**. | GA | Implicitly used (agent turns are long-running/streaming) | Platform feature |
| **Chat SDK** | Vercel's separate open-source chatbot template/app. Not part of Eve's backend. | Template, not verified here in depth | No | Separate |
| **Vercel Connect / connections** | Manages OAuth + API keys for external services; connections dir pairs with MCP servers / OpenAPI. | Product | Optional — only if the agent talks to 3rd-party services with delegated user creds | Yes |
| **Channels** (Slack/Discord/Teams/Telegram/Twilio/GitHub/Linear/web/HTTP) | Platform entry points into the same runtime. | Beta (part of Eve) | Optional — HTTP is enough for an in-app chat UI | Part of Eve |
| **Schedules** | Cron-triggered agent runs. | Beta (part of Eve) | Optional | Part of Eve |
| **Subagents** | Child agents with fresh history/state; built-in `agent` tool or declared under `subagents/`. | Beta (part of Eve) | Optional | Part of Eve |
| **Evals + tracing** | OpenTelemetry spans; "Agent Runs" dashboard built in. | Beta (part of Eve) | Optional | Uses Vercel Observability (GA) |
| **Human-in-the-loop approvals** | `needsApproval` on a tool: `always()` / `once()` / `never()` / predicate. Gated call **pauses durably, indefinitely, without consuming compute**, then resumes exactly where it left off. | Beta (part of Eve) | Optional but a highlight | Eve feature |

**Key distinction:** AI SDK, AI Gateway, Sandbox, Workflows, Connect are **pre-existing (mostly GA) Vercel products**. Eve is the **new, beta** convention layer that stitches them into an "agent folder." You can use the GA pieces without Eve.

---

## 3. Deployment & lock-in

- **On Vercel:** an Eve agent is *"an ordinary Vercel project, `vercel deploy` ships it to production unchanged"* ([blog](https://vercel.com/blog/introducing-eve)). Durable sessions require **Vercel Workflows**; the sandbox uses **Vercel Sandbox**; models route through **AI Gateway** (with OIDC so you don't manage keys). ([docs](https://vercel.com/docs/eve))
- **Self-hosting / "run anywhere":** the npm description literally says *"...that run anywhere"* and the runtime dep is **Nitro** (which emits portable output). But the **docs say it "runs on Vercel Functions"**, and the blog hedges: *"eve deploys to Vercel, with support for other platforms on the way."* So off-Vercel is **aspirational, not turnkey** today. (verified: package.json, docs, blog)
- **Evidence it *can* run off-Vercel:** `vercel-labs/steve` — a **proof-of-concept** deploying an Eve agent to a DigitalOcean droplet with **zero Vercel-proprietary infra**, swapping Workflow→self-hosted Postgres, Sandbox→Docker, AI Gateway→direct provider APIs, dashboard→CLI+OTel. It's explicitly a PoC in Vercel's experimental `vercel-labs` org, i.e. **DIY, unsupported**. ([steve repo](https://github.com/vercel-labs/steve))
- **Net portability:** the *authoring model* (folders, `defineTool`, AI SDK) is portable; the *durable-session + sandbox + gateway runtime* is Vercel-managed unless you re-implement it yourself (as `steve` did). For Mechiron, treat Eve-on-Vercel as **effectively Vercel-coupled** for durability/sandbox.

---

## 4. Pricing signals (budget these if you go Vercel-managed)

All Eve costs are pass-through to underlying Vercel resources ([eve pricing](https://vercel.com/docs/eve/pricing)):

- **AI Gateway:** pay-as-you-go, **zero markup** on tokens (even BYOK); free tier = subset of models with lower rate limits. You still pay the provider's list token price. Add-ons (Custom Reporting, ZDR, provider allowlist) are extra but off by default. ([AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing))
- **Vercel Workflows** (powers durable sessions — you pay this *per agent session*): **Events $0.02 / 1K** (50K/mo free on Hobby), **Data Written $0.50 / GB**, **Data Retained $0.50 / GB-month**. Every state transition + every streamed chunk is an event / written data. A chatty agent generates a lot of events. ([Workflow pricing](https://vercel.com/docs/workflows/pricing))
- **Vercel Sandbox** (only if you actually run code): **Active CPU $0.128/hr**, **Provisioned Memory $0.0212/GB-hr**, **Creations $0.60/1M**, **egress $0.15/GB**. Pro plan has a **$20/mo credit**; region **`iad1` only**. For CRUD tools you would pay **$0 here** because you won't create sandboxes. ([Sandbox pricing](https://vercel.com/docs/sandbox/pricing))
- **Functions / Fluid Compute:** standard function compute rates; Fluid recommended with Workflows. (billing model: pay for active compute; Fluid reduces idle waste on long streaming turns) ([Workflow pricing](https://vercel.com/docs/workflows/pricing) references [Fluid](https://vercel.com/docs/fluid-compute))

**Analysis:** the recurring cost you can't avoid on Eve-managed is **Workflow events/data per session** on top of model tokens. Running the AI SDK directly in your own Next.js route trades that for plain function-invocation cost + your own DB — likely cheaper and simpler for a low-to-moderate volume RFQ app.

---

## 5. Fit for Mechiron specifically

**(a) Composes with existing server actions?** Yes, mechanically — an Eve tool is `execute(input, ctx)` running *in your app runtime* with full Node access: it can `import` from `lib/`, read `process.env`, and call a database/API ([tools overview](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)). So an Eve tool *could* call your existing Supabase-backed logic. **But** Eve wants tools to live under `agent/tools/*` as its own layer, and it brings its own session/runtime — you'd be adopting a whole runtime to wrap functions you already expose as server actions. The AI SDK reaches the same place with far less: define `tools` inline in a Next.js route and call your existing account-scoped functions directly.

**(b) Sandbox & sub-agents are irrelevant to your case.** Creating an RFQ, adding a client, sending an email are typed CRUD calls — no arbitrary code execution, no parallel specialist agents. The demos lead with Sandbox (Python data analysis) and subagents because they're impressive, not because a form-driven B2B app needs them. Skipping them means skipping most of Eve's reason to exist. *(my analysis)*

**(c) Multi-tenancy / `account_id` — real risk, framework-agnostic.** Your CLAUDE.md rule is "never skip `account_id` filtering; RLS is the tenant boundary." An agent tool executes server-side and can hold elevated context; if a tool calls Supabase with the service/secret key or an unscoped client, it bypasses RLS and can cross tenants. Mitigation (same whether Eve or AI SDK): **every tool must resolve the current user's `account_id` from the authenticated session and reuse your existing account-scoped server actions** — never a raw admin client. `ctx.session` in Eve carries auth ([tools overview](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)), but you still have to enforce scoping yourself. *(my analysis + docs)*

**(d) Human-in-the-loop for risky mutations — Eve's best idea, replicable without it.** Eve's `needsApproval: always()/once()/never()/predicate` pauses a gated tool call durably and resumes after approval ([tools overview](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)). For "send email to suppliers" / "create RFQ" this is exactly the gate you want. You can reproduce it with the AI SDK by **not executing** high-risk tools automatically: return the proposed tool call to the UI, show a Hebrew confirmation modal (you already use one for non-approved suppliers), and only run the mutation on user confirm. You get the durability-lite version without adopting Workflows. *(my analysis)*

**(e) Hebrew / RTL — a non-issue at this layer.** The agent backend (tools, model calls) is language-agnostic. Hebrew/RTL is entirely your chat UI's concern, handled by your existing i18n + `dir="rtl"` setup. Neither Eve nor the AI SDK helps or hurts here. *(my analysis)*

---

## 6. Alternatives / the lighter path (recommended)

**Minimum viable stack for Mechiron's vision: the AI SDK, in your existing app.**

- **AI SDK v7 is GA and stable**, framework-agnostic, works directly in Next.js, and supports tool calling via `generateText`/`streamText` + `tools` ([ai-sdk.dev](https://ai-sdk.dev/docs/introduction)). It's the same tool loop Eve uses internally — you just skip Eve's folder/runtime wrapper.
- **Shape:** one Next.js route/server action → `streamText({ model, tools })` where each tool is a thin wrapper over an existing account-scoped server action (create RFQ, add client, send email). Optionally route the model through **AI Gateway** for provider fallback + no key management (that piece is GA and worth using independently of Eve).
- **Approvals:** implement the confirm-before-mutate gate in your own UI (see 5d). No Workflows dependency needed for a chat that completes within a request/short session.
- **Model choice:** per your project memory, your app already targets Claude; the AI SDK supports Anthropic directly (`@ai-sdk/anthropic`) or via Gateway.

**When full Eve *would* pay off (revisit at GA):**
- You need **long-running, multi-step, resumable** jobs that survive redeploys/cold starts (hours-to-days) — that's what Workflow-backed durable sessions buy.
- You want **multiple channels** (a Slack bot for the manufacturer's team, not just in-app chat).
- You want **scheduled/autonomous** agent runs, sub-agents, or sandboxed code execution.

None of those match "a chat box that performs a few scoped CRUD actions" today. **Verdict: full Eve is overkill for Mechiron's stated use case. Start with the AI SDK; keep Eve on the watchlist for after it reaches GA.**

---

## 7. Follow-up Q&A

Three direct questions that came up after the initial report.

### Q: Does Eve contain the AI SDK?

**Yes.** The mental model: **the AI SDK is the engine; Eve is the car built around it.**

- The **AI SDK** does the actual work — talking to the model, the tool-calling loop (model asks to call a tool → your code runs it → result returns → model continues), and token streaming.
- **Eve** sits *on top of* the AI SDK and wires it into other Vercel products (Workflows for durable sessions, Sandbox for code execution, AI Gateway for model routing, Connect for OAuth), all discovered from your `agent/` folder structure ([docs](https://vercel.com/docs/eve)).

They are not competitors at the same layer. Eve **includes and depends on** the AI SDK. So "AI SDK vs Eve" really means: *"just the engine, wired up myself"* vs *"the engine plus Vercel's pre-assembled chassis."* A practical upshot: if you start on the plain AI SDK and later outgrow it, moving to Eve is an **evolution, not a rewrite** — your tools and model calls carry over.

### Q: What is the added value of Eve over the raw AI SDK?

Everything Eve adds is **infrastructure and convention around** the tool loop — not a better tool loop:

| Eve adds | What it means | Needed for Mechiron? |
|---|---|---|
| **Durable sessions** (via Workflows) | A conversation survives crashes/redeploys/cold starts; can pause for hours/days and resume exactly where it left off | No — chats complete in a request/short session |
| **Human-in-the-loop approval gates** | `needsApproval` pauses a tool call durably until a human approves, then resumes | The *idea* yes; doable in your own UI without Eve (see §5d) |
| **Sandbox** | Runs untrusted/model-generated Python/bash in isolated microVMs | No — CRUD, not code execution |
| **Sub-agents** | Delegate subtasks to child agents with fresh context | No |
| **Channels** | Same agent reachable from Slack/Teams/Discord/web with near-zero wiring | Not now (maybe later for the manufacturer's team) |
| **Schedules** | Cron-triggered autonomous runs | No |
| **Connect / connections** | Managed OAuth to 3rd-party services | No — data lives in your own Supabase |
| **"Agent Runs" dashboard** | Built-in observability/tracing of every run | Nice-to-have, not essential |
| **Folder conventions + compile step** | Drop a file in `tools/`, it's auto-registered — no manual wiring | Convenience, not capability |

**Pattern:** every row is either (a) irrelevant to a CRUD chat agent, or (b) replicable yourself. Eve's real value appears for **long-running, multi-channel, autonomous, or code-executing** agents — none of which describe Mechiron's use case.

### Q: Can you build a *complete* agent with each?

**Yes to both — but "complete" means different things.**

- **AI SDK alone → a complete agent for this use case.** A chat box where the user says "create an RFQ for client X," the agent calls your `createRfq` server action, confirms, and replies — fully buildable with `streamText({ model, tools })` in a single Next.js route. Nothing missing for Mechiron. You own the session state (request + your DB), the UI, and the approval flow.
- **Eve → a complete agent *platform*.** The same CRUD agent *plus* durability, multi-channel, scheduling, and sandboxing out of the box. "More complete" in the sense of *more features pre-assembled* — but for this scope, most of that is weight carried without use.

**Honest framing:** the AI SDK isn't a limited subset that can't reach "complete." It gives you the 100% you need; Eve gives you 100% + extra (that also happens to be beta and adds per-session Workflow billing). For Mechiron the AI SDK is the complete answer today.

---

## Claim-confidence key

- **Verified in official docs/source:** everything cited to `vercel.com/docs/*`, the `vercel/eve` repo, npm registry, `ai-sdk.dev`, official blog/changelog.
- **Marketing claim, treat with caution:** "production comes built in" (blog) — contradicted by the beta banner in the docs. "run anywhere" (npm description) — only demonstrated via a `vercel-labs` PoC, not a supported path.
- **My analysis/inference:** all fit-for-Mechiron reasoning in §5–§6 and the pricing implications in §4 are labeled as such.

---

## Sources (primary URLs fetched)

- Eve docs (home): https://vercel.com/docs/eve
- Eve concepts: https://vercel.com/docs/eve/concepts
- Eve pricing & limits: https://vercel.com/docs/eve/pricing
- Eve tools overview (repo): https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx
- Eve README (repo): https://github.com/vercel/eve/blob/main/README.md
- Eve AGENTS.md (repo): https://github.com/vercel/eve/blob/main/AGENTS.md
- Eve package.json (repo): https://github.com/vercel/eve/blob/main/packages/eve/package.json
- npm registry (eve): https://registry.npmjs.org/eve
- Official blog — "Introducing eve": https://vercel.com/blog/introducing-eve
- Official changelog — "Introducing eve, an open-source agent framework": https://vercel.com/changelog/introducing-eve-an-open-source-agent-framework
- Self-host PoC — vercel-labs/steve: https://github.com/vercel-labs/steve
- AI Gateway pricing: https://vercel.com/docs/ai-gateway/pricing
- Vercel Sandbox pricing & limits: https://vercel.com/docs/sandbox/pricing
- Vercel Workflows: https://vercel.com/docs/workflows
- Vercel Workflows pricing & limits: https://vercel.com/docs/workflows/pricing
- Vercel AI SDK: https://ai-sdk.dev/docs/introduction
- Workflow SDK (open source): https://workflow-sdk.dev
