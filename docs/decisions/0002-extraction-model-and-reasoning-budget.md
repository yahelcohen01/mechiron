# 0002 — Ship `gemini-3-flash` at `reasoning: 'low'`

**Status:** accepted
**Date:** 2026-09-17
**Issue:** #27 · **PR:** #39 · **Full measurement:** [`../development/drawing-auto-detection/README.md`](../development/drawing-auto-detection/README.md) § *Model selection — 2026-09-17*

## Context

The gateway key had been restricted to free tier since the feature was designed, so
`google/gemini-2.5-flash-lite` was the only reachable model. That default was a *constraint* recorded
as if it were a choice, and two beliefs had grown on top of it:

- that reading was solved even at the cheapest tier (from a single validation run, PR #26)
- that the shipping decision therefore hinged on classification quality alone

Credits were added on 2026-09-17 and every candidate became reachable. Each configuration was then
run through the evaluation lane **twice** — both sample sheets, 8 assertions per run.

| configuration | result | stability | latency | output tokens |
|---|---|---|---|---|
| `gemini-2.5-flash-lite` | **7/8 — failed** | different findings each run | 2.5–3.9 s | 144–293 |
| `gemini-3-flash`, provider-default reasoning | 8/8 | byte-identical | **16–52 s** | 1974–6397 |
| `gemini-3-flash`, `reasoning: 'low'` | 8/8 | byte-identical | 2.5–3.6 s | 92–138 |

Both prior beliefs were false:

**Reading was never solved at the cheapest tier.** It had only ever been measured on
`LABEL: value` callouts. On a sentence-shaped note, `flash-lite` split
`BAKE PART AFTER PLATING WITHIN 3 HOURS PER ASTM B850 CLASS ER-9` into a label `BAKE` plus a spec
value beginning `PART AFTER PLATING`, and returned a different finding count on each of two
consecutive runs.

**The feature did not have a latency problem, it had a configuration default.** `gemini-3-flash` at
its default thinking budget produced *identical* findings for 46× the output tokens and up to 52 s
instead of 3 s.

## Decision

**Ship `google/gemini-3-flash` with `reasoning: 'low'`.** Both are defaults in
`src/lib/extraction/extract.ts` (`DEFAULT_EXTRACTION_MODEL`, `DEFAULT_EXTRACTION_REASONING`),
overridable via `AI_EXTRACTION_MODEL` and `AI_EXTRACTION_REASONING`.

The reasoning budget is expressed as the AI SDK's **portable top-level `reasoning` parameter**, not a
Google-specific `thinkingConfig`. The model ID is configuration here, so the knob that controls its
cost has to survive a change of provider.

An unrecognised `AI_EXTRACTION_REASONING` value falls back to `'low'` rather than erroring: a typo
must not take out RFQ creation, and must not silently unleash a 52-second budget either.

## Consequences

**Makes easy:** the accurate model is also the fast one. Correctness no longer trades against
latency, so #15's progress panel does not have to be designed around a 50-second wait.

**Makes hard:** extraction now bills at paid-tier rates rather than free-tier. At ~1419 input and
~138 output tokens per drawing this is negligible, but it is no longer zero.

**Forbids:** raising the reasoning budget without re-running the evaluation lane **twice at both
values**. 46× the output tokens for an identical answer is the measured cost of getting this wrong.

**Also forbids** trusting the historical claim that reading is cheap. Any future cost-reduction
attempt has to re-measure reading on *sentence-shaped* notes, not just labelled callouts.

**Consequences elsewhere:**

- `AI_EXTRACTION_ENABLED=false` in production has lost its justification — #27 was the gate. The
  remaining gate is a browser pass on the UI surfaces.
- **#15** must tolerate a slow read: one outlier run took 12 s while emitting only 92 output tokens,
  so the variance is in the gateway, not the thinking budget.
- The lane now reports what it actually ran. It previously titled results with
  `DEFAULT_EXTRACTION_MODEL` even when the environment overrode it, recording the wrong model against
  its own numbers — see `resolveExtractionModel()` / `resolveExtractionReasoning()`.

## Alternatives rejected

**`gemini-2.5-flash-lite`** — 1.4 s faster, and cheapest. Rejected because it mangles spec values. A
mutilated specification reaching a supplier is the exact harm the entire trust surface (#14, #18)
exists to prevent, and no latency saving buys that back.

**`gemini-3-flash` at provider-default reasoning** — identically correct. Rejected on 16–52 s
latency for zero measured benefit, since extraction fires while the user is still filling the form.

**`gemini-3.1-pro-preview`** — reachable, and the Pro-tier candidate the spec named after
`google/gemini-3-pro` turned out not to be a valid gateway model ID. Rejected three times over:
preview status for a feature shipping enabled by default, slowest candidate (6.7 s on a five-token
probe), and an empty response to that probe.

**`gemini-2.5-pro` and `anthropic/claude-sonnet-4-5`** — both reachable, neither evaluated. Not
rejected on merit: escalation stopped once a configuration was both correct and fast. Revisit only if
a sheet defeats `gemini-3-flash`.

## Scope of the evidence

Two drawings, same CAD system, same language, similar layout. Two runs per configuration is enough to
catch the instability that one run hid — it is **not** enough to call the model reliable on scanned,
skewed, or multi-sheet drawings. See also the standing rule that one green eval run proves nothing.
