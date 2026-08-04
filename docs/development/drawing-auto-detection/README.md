# Drawing Auto-Detection

Status: **extraction pipeline built (#12); reading and classification both validated on two sheets; no UI wired yet** · Migrations: `008`, `009` · Owner: @yahelcohen01

> **Read *Validation results* (below) before implementing anything.** The reading
> pipeline was tested ahead of being built and the result invalidated part of this
> design: the two-pass read and the server-side rasteriser are not needed, and two
> recorded sample values were wrong. Superseded passages are struck through rather
> than deleted, so the reasoning that led to them stays legible.

Automatic extraction of manufacturing specifications from an uploaded engineering drawing, using a vision model via Vercel AI Gateway, so that an RFQ's domain sections arrive pre-filled.

---

## Problem Statement

When a user creates an RFQ today, they upload the customer's engineering drawing and then re-type, by hand, information that is already written on that drawing. For every relevant domain — raw material, coating, passivation, quenching, hardening — they must open the drawing, find the notes block, read a line like `MATERIAL: CRES ROD 15-5PH PER AMS 5659`, and transcribe it into the spec field.

This is slow, it is repeated for every RFQ, and it is error-prone in the way that matters most: a mistyped spec value goes out in an email to a supplier, who then quotes against the wrong material or the wrong finish. The user is doing OCR by hand, on a document they already gave the system.

## Solution

When the user selects a drawing file on the new-RFQ form, the system immediately begins reading it in the background while the user continues filling in client, part, and quantity. A vision model locates the drawing's notes block, reads it at full resolution, and classifies each specification it finds into one of the RFQ domains.

By the time the user submits and lands on the RFQ page, the domain spec fields are already populated with the values from the drawing, each marked as AI-sourced until the user confirms it. Anything the model could not read confidently, or could not confidently classify, is surfaced separately for one-click assignment rather than guessed at.

The system learns from those assignments: once the user tells it that a given specification belongs to a given domain, subsequent drawings carrying the same specification are classified automatically.

---

## User Stories

### Core extraction

1. As an RFQ creator, I want the system to start reading my drawing the moment I select the file, so that extraction overlaps with the time I spend filling in the rest of the form rather than adding to it.
2. As an RFQ creator, I want the material specification read off the drawing automatically, so that I do not have to transcribe `AL 6061 T651 PLATE PER AMS 4027` by hand.
3. As an RFQ creator, I want the coating specification read off the drawing automatically, so that anodizing and plating callouts reach the coating supplier without manual entry.
4. As an RFQ creator, I want the passivation specification read off the drawing automatically, so that a `PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII` callout populates the passivation domain.
5. As an RFQ creator, I want hardening and quenching specifications read off the drawing where they are unambiguous, so that heat-treat requirements are not lost.
6. As an RFQ creator, I want the extracted value to be the full specification including its standard reference, so that the supplier receives enough information to quote against.
7. As an RFQ creator, I want specifications kept in the language they appear on the drawing (typically English), so that standard designations such as `AMS 5659` remain the identifiers my suppliers recognise.
8. As an RFQ creator, I want the system to read drawings that are scanned images with no embedded text, so that the feature works on the drawings my customers actually send.
9. As an RFQ creator, I want drawings that are stored rotated to be read correctly, so that page orientation is not a reason for the feature to fail.
10. As an RFQ creator, I want small note text on a large sheet read reliably, so that the feature works on real drawing sheets rather than only on clean close-ups.

### Trust and correction

11. As an RFQ creator, I want AI-filled fields visually distinguished from fields I typed, so that I can tell at a glance what still needs my review.
12. As an RFQ creator, I want to see the exact line of text on the drawing that produced a value, so that I can verify it without opening the PDF.
13. As an RFQ creator, I want to see the cropped image region a value came from, so that I can confirm an uncertain reading against the original pixels in a second.
14. As an RFQ creator, I want to edit any AI-filled value freely, so that the system's suggestion is never a constraint.
15. As an RFQ creator, I want editing an AI-filled value to clear its AI marking, so that the marking reflects what I have actually reviewed.
16. As an RFQ creator, I want a confirmation prompt before sending emails for a domain whose spec is still an unreviewed AI value, so that a misread specification cannot reach a supplier unnoticed.
17. As an RFQ creator, I want the confirmation to appear only once per domain, so that the safeguard does not become noise I click through.

### Uncertainty and abstention

18. As an RFQ creator, I want the model to leave a field empty rather than guess, so that I can trust a filled field more than I distrust an empty one.
19. As an RFQ creator, I want specifications the model read but could not confidently classify to be shown to me rather than discarded, so that no information on the drawing is silently lost.
20. As an RFQ creator, I want to assign an unclassified specification to a domain with one click, so that correcting the system is faster than typing the value myself.
21. As an RFQ creator, I want specifications the model read with low confidence to be treated as unclassified, so that a misread character never silently populates a field.
22. As an RFQ creator, I want the system to abstain on ambiguous heat-treatment language rather than choose between hardening and quenching, so that an RFQ is never routed to the wrong category of supplier.

### Learning

23. As an RFQ creator, I want the system to remember which domain I assigned a specification to, so that I only have to teach it once.
24. As an RFQ creator, I want a specification I have previously classified to be filled in automatically on later drawings, so that the system improves as I use it.
25. As an account owner, I want these learned mappings scoped to my account, so that my shop's terminology does not leak to or from other accounts.

### Progress feedback

26. As an RFQ creator, I want to see that the system is reading my drawing, so that I understand why there is a delay and do not assume the form is broken.
27. As an RFQ creator, I want to see which stage the extraction has reached, so that the progress shown reflects real work rather than a decorative animation.
28. As an RFQ creator, I want to see each specification appear as it is found, so that I get value from the wait before it finishes.
29. As an RFQ creator, I want to see a thumbnail of the drawing being processed, so that I can confirm the right file is being read.

### Resilience

30. As an RFQ creator, I want to be able to create the RFQ even when extraction fails, so that a model outage never blocks my actual job.
31. As an RFQ creator, I want to be able to create the RFQ even while extraction is still running, so that I am never made to wait on it.
32. As an RFQ creator, I want a failed extraction reported quietly and in plain language, so that I am informed without being alarmed by a technical error.
33. As an RFQ creator, I want to retry a failed extraction, so that a transient failure does not cost me the feature for that RFQ.
34. As an RFQ creator, I want to re-run extraction on a drawing that produced poor results, so that an unusual sheet layout is recoverable without re-uploading.
35. As an RFQ creator, I want re-uploading a drawing I have already processed to return instantly, so that repeated work is not repeatedly slow or billed.

### Administration and governance

36. As an account owner, I want to disable AI extraction for a specific client, so that I can honour a customer's confidentiality requirements without losing the feature everywhere.
37. As an account owner, I want to disable AI extraction for every client at once, so that I have an immediate response if something goes wrong.
38. As an account owner, I want extraction data scoped to my account under RLS, so that the multi-tenant boundary holds for the new tables as it does for the existing ones.
39. As an operator, I want abandoned pending uploads cleaned up automatically, so that scratch files from unfinished forms do not accumulate in storage.

---

## Implementation Decisions

### Framing: the six fields are the six domains

The six items originally requested — material, coating, passivation, hardening, quenching, subcontractor — are exactly the members of `RFQ_DOMAINS`. The feature is therefore not "extract six arbitrary fields" but "for each RFQ domain, determine whether the drawing calls for it and what its spec value is."

This means the destination already exists: `rfq_domain_configs.spec_value`, rendered today by the domain section on the RFQ page with an autocomplete fed by previously used values. Extraction writes into that existing field. **The email-sending flow is not modified.**

### Evidence from sample drawings

Two representative drawings were analysed (`examples/test-n8n.pdf`, `examples/test-n8n-2.pdf`). Their properties drove several decisions:

| Property | Sample 1 | Sample 2 |
| --- | --- | --- |
| Embedded text layer | none | none |
| Embedded raster resolution | 2246 × 1456 px | 2032 × 1570 px |
| Page geometry | A4 MediaBox, `/Rotate 90` | A4 MediaBox, `/Rotate 90` |
| Language | English, all-caps CAD text | same |
| Location of specifications | notes block, small text, one corner | same |

Extractable content:

- Sample 1 — `MATERIAL: AL 6061 T651 PLATE PER AMS 4027.` (raw material); `FINISH: ANODIC COATING PER MIL-PRF-8625 TYPE I CLASS 1, 2.0 TO 10.0 MICRON THICK, SEAL WATER.` (coating). Nothing else.
- Sample 2 — `MATERIAL: CRES ROD 15-5PH PER AMS 5659` (raw material); `HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D.` (ambiguous); `FINISH - PASSIVATION TREATMENT PER AMS-QQ-P-35 TYPE VIII.` (passivation); `BAKE PART AFTER PLATING WITHIN 3 HOURS PER ASTM B850 CLASS ER-9.` (ambiguous).

> **Correction, 2026-08-03.** Two of the values above were previously recorded as
> `AMS-QQ-A-250/11` and `H-1075`. **Both were wrong** — they were introduced during
> this document's own analysis phase and never checked against the drawings. The
> sheets read `AMS 4027` and `H1025`, confirmed visually by @yahelcohen01.
>
> This matters beyond the typo. Both incorrect values are *real, plausible*
> designations for the same materials, so neither looked wrong on the page. They
> had already been copied into issue #12 as pass/fail acceptance criteria, where
> they would have failed a model that was reading the drawing correctly and sent
> someone to "fix" working behaviour. They were caught only because a validation
> run disagreed with them and the disagreement was checked rather than assumed to
> be a model error. Treat every value in this section as evidence, not as ground
> truth, until it has been confirmed against the sheet.

Three constraints were originally derived from this. **The first did not survive validation** — see *Validation results* below:

1. ~~**The embedded raster is the detail ceiling.** At roughly 2000 px on the long edge, rendering at a higher DPI invents nothing. Note text is already marginal at native resolution. Any downscale — and every vision model downscales a full sheet — loses it. This is the single biggest determinant of accuracy.~~ **Superseded.** The claim that every vision model downscales a full sheet was true of the previous model generation and is no longer. Both sheets sit under the current high-resolution input caps, and a direct read of the unmodified PDF recovered every known line character-exact.
2. **Pages carry `/Rotate 90`.** Naive rasterisers ignore or misapply this; rotated text measurably degrades OCR. Still true of the files, but no longer something this feature must handle itself while it sends the PDF whole — the provider applies it. It becomes relevant again if, and only if, we rasterise for a UI surface.
3. **Nothing on either drawing indicates a subcontractor.** There is no textual anchor for that domain.

### Validation results — 2026-08-03

The reading half of the design was tested before being built, by sending both
unmodified sample PDFs to a vision model and scoring the transcription against
the known lines. **All six known specification lines came back character-exact**,
including the full anodic-coating and bake-after-plating callouts, on
`google/gemini-2.5-flash-lite` — the *cheapest* model reachable, chosen only
because the gateway key was restricted to free tier. Latency was 3.4 s and 4.2 s;
the whole page cost roughly 1,350 input tokens.

Consequences, in order of how much they change:

- **The two-pass locate/read design is unnecessary.** It existed solely to avoid a
  downscale that does not occur. A single pass over the whole PDF is sufficient
  and is also more robust to unusual sheet layouts, since there is no
  notes-block localisation step left to defeat.
- **Server-side rasterisation is not required for accuracy.** It retains a
  possible role in UI surfaces only (the progress thumbnail, and the source crop
  on the unassigned-findings card). Both may be better solved client-side or, in
  the crop's case, may be unnecessary given that the verbatim source line is
  already returned. Do not build it until one of those surfaces is designed and
  needs it.
- **The latency budget is wrong.** The estimate of 8–15 s drove the design of the
  live progress panel. Measured single-pass latency is under 5 s.
- **`google/gemini-3-pro` is not a valid model ID** on Vercel AI Gateway. The
  Pro-tier candidate is `google/gemini-3.1-pro-preview`, which is a *preview*
  model — a consideration for a feature shipping enabled by default. Given that
  `flash-lite` already scores 6/6 on reading, model selection should be driven by
  classification quality, not OCR.

**Scope of this result.** Two drawings, same CAD system, same language, similar
layout, one run each against a non-deterministic model. It says nothing about
scanned, skewed, or multi-sheet drawings, and **nothing at all about the
classification and abstention half of the feature**, which remains the genuinely
unvalidated part.

### Classification results — 2026-08-04 (issue #12)

The first evaluation of the *classification* half, on the same two sheets and
the same `google/gemini-2.5-flash-lite`. Reading was character-exact again on
both sheets, including `AMS 4027` and `H1025`.

Classification was correct on first attempt for every unambiguous line —
material, coating, and passivation each landed in the right domain on both
sheets, and nothing was ever assigned to `subcontractor`.

**Abstention was not.** On the first run the model classified
`HEAT TREAT TO H1025 PER AMS-H-6875 CLASS D` as `hardening`. It had not misread
anything; it had reasoned correctly that H1025 is an age-hardening condition for
15-5PH and applied that knowledge. This is precisely the failure the
over-abstaining design exists to prevent, and it was invisible to the reading
evaluation that preceded it.

The fix was a prompt rule, not a model change: **judge only on words literally
printed, and never infer a domain from what a standard number, class, temper
code, or material condition designation means.** The relevant sentence is in
`src/lib/extraction/prompt.ts`. With it, both ambiguous lines abstain.

The generalisable point: the model's *domain knowledge* is the adversary here,
not its eyesight. A vision model that knows metallurgy will happily supply the
inference the drawing does not state. Rules phrased as "only when X is
explicit" are read as permission to establish X by reasoning; rules phrased as
"only when the word X literally appears" are not.

Still unmeasured: any sheet that is scanned, skewed, multi-sheet, or from a
different CAD system, and every classification boundary these two sheets do not
happen to contain.

### Reading pipeline

**Trigger point.** Extraction fires on file-select, not on submit, so that it overlaps with the remainder of form entry. Two alternatives were considered and rejected: running it inside RFQ creation (makes creation hostage to a model call) and running it after redirect on the RFQ page (rejected by the developer in favour of the simpler single trigger point).

~~**Staging location.** The file is uploaded on select to `{account_id}/_pending/{uuid}/{filename}`, because no `rfq_id` exists yet. A scheduled sweeper deletes pending prefixes older than 24 hours.~~

**Superseded — no staging.** The picked file is posted straight to the server, read
in memory, and the findings are returned in the same response. Nothing is persisted
at file-select time.

The staging prefix existed to park bytes where a *background job* could find them,
because the two-pass read was budgeted at 8–15 s — too long to hold a request open.
Measured single-pass latency is under 5 s, which is an ordinary request. Extraction
needs *bytes*, not a *stored object*.

This deletes the `_pending/` prefix, the second upload, and the 24-hour sweeper
(issue #21, closed). Findings live in the form's client-side state until submit,
and are written to the database alongside the RFQ.

**Transport: a Route Handler, not a Server Action.** Next.js caps server-action
request bodies at 1 MB by default and `next.config.ts` sets no `bodySizeLimit`; a
large drawing would fail with an unhelpful error. Route handlers have no such cap
(the platform limit is 100 MB). The endpoint enforces its own explicit size ceiling
and rejects oversized files with a clear message rather than burning time and model
spend on them.

**Trade-off, stated honestly.** Nothing is durable mid-flight, so a dropped
connection loses the read and the user re-picks the file — cheap at 4 s, and the
file-hash cache makes the retry free. Revisit if extraction slows materially
(multi-sheet, tiling fallback), at which point the background-job shape and its
staging return.

**The existing upload path is deliberately left untouched.** RFQ creation continues to upload the file exactly as it does now, to `{account_id}/{rfq_id}/{filename}`. An earlier version of this design had RFQ creation *move* a staged file to its final path to avoid a second upload. That was withdrawn: a move is a copy followed by a delete, and a partial failure orphans or loses a customer's drawing — in a code path that works correctly today, for a modest latency win. With staging removed there is no second upload to avoid, and this path is simply unaffected.

**Rasterisation.** ~~`pdfjs-dist` in a Node runtime. Chosen because no native binaries are available in the deployment environment, and because it honours `/Rotate` correctly, which addresses constraint 2. Sheet 1 only.~~

**Superseded.** No server-side rasterisation is needed for reading; the PDF is sent
as-is. `pdfjs-dist` may return if a UI surface needs pixels — see *Validation
results*. Its original justifications (no native binaries in the deployment
environment, correct `/Rotate` handling) still hold and should be reused if so.

**Single-pass read — the design as validated.** The unmodified PDF is sent whole,
with one request: transcribe the specification callouts verbatim and classify each
one. The measured result is character-exact transcription in under 5 seconds.

~~**Two-pass read.** Because of constraint 1, the page is never sent to the model whole at reduced resolution:~~

- ~~*Pass 1 — locate.* The downscaled full page is sent with a single question: where are the notes block and title block? Returns bounding boxes. Cheap, and low resolution is sufficient for locating a large contiguous region.~~
- ~~*Pass 2 — read.* Those regions are cropped from the source raster **at native resolution and never downscaled**, and sent for verbatim reading and classification.~~

**Superseded.** The two-pass design existed only to route around a downscale that
does not occur. Of the two alternatives originally rejected, the first — *"sending
the PDF bytes directly to a PDF-native model (simplest, but eats the downscale and
is expected to misread note text)"* — was rejected on a prediction that testing
disproved. It is now the chosen design. The second (a fixed grid of
native-resolution tiles) remains rejected and is now the fallback's fallback.

**Model.** Via Vercel AI Gateway; requires `AI_GATEWAY_API_KEY`. The originally
named "Gemini 3 Pro" **is not a valid gateway model ID**. Since reading is solved
even at the cheapest tier, pick the model on classification quality and cost, not
on OCR strength — and re-run the evaluation lane against whichever model ships.
Splitting reading and classification across two models was considered and deferred
— start single-model, split only if classification specifically proves to be the
weak half.

### Classification and abstention

The model classifies each finding into **one of the six domains, or abstains**. An earlier design proposed that the model return unclassified findings and a deterministic rule layer assign them to domains; this was explicitly overridden by the developer, who requires direct classification into the six domains.

Because the boundary between `hardening` (חיסום) and `quenching` (חישול) could not be specified up front, the day-one prompt is deliberately **over-abstaining**:

- `quenching` only on explicit quench or temper language.
- `hardening` only on explicit harden, age, or case-harden language.
- Abstain on anything else, **including a bare `HEAT TREAT`**.

The reasoning: an abstention costs the user one click, whereas a wrong classification costs an email to the wrong category of supplier. Over time, learned mappings close the gap.

`subcontractor` is **excluded from v1 extraction entirely**. There is no textual anchor for it on a drawing, and detecting a domain with no anchor is a hallucination generator. It remains manually filled.

**OCR confidence is tracked separately from classification.** The model returns text verbatim and marks a finding low-confidence where it is uncertain of any character. Low-confidence findings never auto-fill, regardless of how confidently they were classified.

### Unassigned findings

Abstentions and low-confidence reads are not discarded. They appear on the RFQ page as an unassigned-findings card, each showing the read text alongside **the cropped image region it came from**, with the six domains as one-click assignment buttons. This card is both the recovery mechanism for abstention and the input surface for learning.

### Learned mappings

Assigning an unassigned finding to a domain writes a rule scoped to the account. Those rules are injected into the prompt for subsequent extractions, so a specification classified once is classified automatically thereafter.

This is the mechanism by which the hardening/quenching boundary — which neither the developer nor the model can specify today — gets encoded: by the developer using the application, rather than by answering a specification question in advance.

### Spec value shape

Verbatim, in the drawing's language (typically English), full specification with the label stripped: `CRES ROD 15-5PH PER AMS 5659`, not `15-5PH` and not a translation. A specification is an identifier, not prose; suppliers quote against the standard designation, and translating `AMS 5659` into Hebrew helps no one.

### Trust surface

AI-filled fields render with a sparkle marker and tinted border until the user edits the field or sends the domain. Hovering the marker reveals the verbatim source line. Sending emails for a domain whose spec value is still an unreviewed AI value triggers a one-time confirmation. This complements the existing guard that already blocks sending when the spec field is empty.

### Progress feedback

On file-select the upload area is replaced by an inline panel containing a thumbnail of the actual rendered drawing page with a scanning sweep passing over it, beneath which live status lines advance as the real pipeline reaches each stage (`מעלה שרטוט` → `מאתר בלוק הערות` → `קורא מפרטים`). Each finding then types itself in as it is parsed.

The progress shown is real, not decorative. ~~Expected latency is roughly 8–15 seconds for the two-pass read — long enough that a generic spinner would read as broken.~~

**Revised.** Measured single-pass latency is **3.4–4.2 seconds**, not 8–15. At that
duration the elaborate panel is likely over-built: a plain loading state may be
adequate, and the staged status lines (`מעלה שרטוט` → `מאתר בלוק הערות` → `קורא מפרטים`)
no longer map to real stages, since notes-block localisation no longer happens.
Re-open this design when #15 is picked up.

### Failure behaviour

Extraction is **fully non-blocking**. It never prevents RFQ creation.

- Failure, timeout, or gateway outage: RFQ is created normally, domains stay empty, a quiet inline notice appears in Hebrew with a retry button. Raw errors are never surfaced.
- Submit while extraction is in flight: the submit button stays enabled and adopts the loading state, waiting up to **15 seconds**, then proceeds without results.
- At most one automatic retry.

### Caching and re-runs

Results are cached on file hash, scoped per account — re-uploading the same drawing returns instantly and incurs no model cost. A manual re-scan control on the RFQ page bypasses the cache, capped at **3 per RFQ**, for sheets whose layout defeats the localisation pass.

### Schema changes

Two migrations, both **purely additive**. No `ALTER` of an existing column's type, no data migration, no drops, no changes to existing RLS policies, and no modification to `rfqs`, `parts`, or the send flow.

**Migration `008` — new tables.** All three have RLS **enabled** with policies, explicitly not repeating the `002`/`007` defect where policies were created but row-level security was never switched on.

```
rfq_drawing_extractions
  id, rfq_id, account_id,
  file_hash        -- cache key; the same drawing is never billed twice
  status           -- pending | completed | failed
  model, raw_response (jsonb),
  created_at, completed_at

rfq_drawing_findings
  id, extraction_id,
  label, raw_text      -- verbatim as read
  confidence           -- high | low
  page, bbox (jsonb)   -- enables showing the source crop
  domain               -- null = unassigned
  assignment_source    -- auto | learned | user
  applied

account_spec_mappings
  id, account_id, pattern, domain, hit_count, created_at
```

**Migration `009` — new columns on existing tables**, isolated from `008` so it can be reverted independently.

```
clients.ai_extraction_enabled     boolean not null default true
rfq_domain_configs.spec_source    null | 'ai' | 'user'
```

`spec_source` is what makes an AI-written value identifiable and therefore bulk-clearable during a rollback; without it, an AI fill is indistinguishable from a hand-typed one.

Down files are written alongside the up files in `supabase/rollback/`, per project convention.

### Degradation requirement

**Every read of the new tables must tolerate their absence or emptiness at the boundary.** If migration `008` is dropped while the new code is still deployed, extraction must degrade to "found nothing" — it must not error the RFQ page. This is what makes the schema rollback safe to perform independently of the code rollback.

### Kill switch

Three levels, fastest first:

1. **Instant, no deploy** — `UPDATE clients SET ai_extraction_enabled = false;` disables extraction for every client in a single statement. This is the primary justification for that column.
2. **Environment** — `AI_EXTRACTION_ENABLED=false`, requiring a redeploy.
3. **Deployment rollback** to the previous version.

### Rollback procedure

```bash
# 0. before anything
npm run db:migrate:safe          # existing script: pg_dump backup, then push

# 1. instant mitigation, no deploy
UPDATE clients SET ai_extraction_enabled = false;

# 2. code
#    promote the previous deployment

# 3. schema, in reverse order
psql "$DATABASE_URL" -f supabase/rollback/009_ai_extraction_columns.down.sql
psql "$DATABASE_URL" -f supabase/rollback/008_drawing_extractions.down.sql

# no storage step: extraction never writes to storage
```

`009` reverts before `008` so that nothing references a dropped object mid-way.

### Reversibility assessment

| Layer | Reversible | Mechanism |
| --- | --- | --- |
| `008` — three new tables | Trivially | `DROP TABLE` ×3; nothing else references them |
| `009` — two new columns | Trivially | `DROP COLUMN` ×2; both nullable or defaulted, no table rewrite |
| Application code | Yes | Promote the previous deployment |
| ~~Staged storage files~~ | ~~Yes~~ | ~~Delete the `_pending/` prefix~~ — no longer applicable; extraction writes nothing to storage |
| AI-written spec values | Yes | Identifiable via `spec_source` |
| **Emails already sent to suppliers** | **No** | Mitigated by the unreviewed-AI send confirmation |
| **Drawings already transmitted to the model provider** | **No** | Mitigated by `clients.ai_extraction_enabled` |

There are no sensitive or hard-to-reverse migrations in this feature. The genuinely irreversible actions are the two at the bottom of the table, both of which are outward-facing rather than schema-level.

### Rollout

The developer elected to ship with `ai_extraction_enabled` defaulting to **true**, so the migration deploy is the launch. The acknowledged consequence: the two-pass read is unverified against real drawings at that moment, and drawings begin reaching the model provider immediately. This was judged acceptable because extraction never blocks RFQ creation and the unreviewed-AI send confirmation stands between a misread and a supplier's inbox. The one-statement kill switch should be kept within reach during the first days of use.

### New dependencies

- ~~`pdfjs-dist` — PDF rasterisation with correct `/Rotate` handling.~~ **Not needed.** No longer required for reading; revisit only if a UI surface needs pixels.
- `ai` (v7) with the Vercel AI Gateway provider, plus `zod` for the response schema. Both installed in #12.
- `AI_GATEWAY_API_KEY` — added to `.env.local` by the developer directly. **Note:** the key in use during validation was restricted to free tier, which blocked every model above `gemini-2.5-flash-lite` despite a positive credit balance. Re-confirmed still in force on 2026-08-04; the free tier also rate-limits hard enough that three reads in a minute fail. Resolve (#27) before running the evaluation lane against the production model.
- `AI_EXTRACTION_MODEL` — optional override for the gateway model ID. Defaults to `google/gemini-2.5-flash-lite`, which is a *constraint*, not a considered choice: it is the only model the current key can reach.

---

## Testing Decisions

### What makes a good test here

Tests assert externally observable behaviour: given a drawing file, what findings come out. They must not assert prompt wording, intermediate crop coordinates as literal pixel values, or the internal shape of the model response — all of which will change as the prompt is tuned, and none of which a user can perceive.

### Note on prior art

~~**There is currently no test infrastructure in this repository** — no test runner, no configuration, no existing test files. There is therefore no prior art to follow, and the seams below are a new proposal rather than an extension of an existing pattern. They require sign-off before implementation.~~

**Superseded.** Both lanes exist (#9): `npm test` → `vitest.config.mts`, and
`npm run test:eval` → `vitest.eval.config.mts`, which excludes itself from CI by
living behind a separate config. The seam described below is implemented in
`src/lib/extraction/`, with the deterministic lane in `extract.test.ts` and the
billed lane in `extract.eval.test.ts`.

### Proposed seam

**One seam**, at the highest available point: the extraction pipeline exposed as a single function taking file bytes plus context (the account's learned mappings and existing spec vocabulary) and returning findings. Everything else in the feature — the upload route handler, the progress panel, the unassigned card — is thin glue around it and is exercised manually.

This is preferred to seams at the rasteriser, the prompt builder, or the classifier individually, on the grounds that fewer seams are better and this one is the highest point that still isolates the risky logic.

### Two test modes across that seam

1. ~~**Deterministic (CI-safe, no model call).** Covers the rasterisation half: that `/Rotate 90` is applied, that the located regions are non-empty, and that crops preserve native resolution rather than downscaling.~~ **Superseded** — there is no rasterisation half to protect. The CI lane still exists (see `vitest.config.mts`) and should cover the deterministic parts that remain: prompt/context assembly, parsing and validating the model response, applying learned mappings, and degrading to "found nothing" when the `008` tables are absent.
2. **Evaluation (manual, billed).** The full pipeline against `examples/test-n8n.pdf` and `examples/test-n8n-2.pdf` as fixtures, asserting that the known material, coating, and passivation specifications are found, and that the ambiguous heat-treatment lines abstain rather than classify. Run deliberately, not in CI, because it costs money and is non-deterministic.

**Assert the corrected values.** The fixtures' known lines are `AMS 4027` and
`H1025` — not `AMS-QQ-A-250/11` and `H-1075`. See the correction note in *Evidence
from sample drawings*.

**When an eval disagrees with this document, check the drawing before assuming the
model is wrong.** That is not a general principle; it is the specific mistake this
document already made once, and the reason the two values above needed correcting.

Additional real drawings should be added as fixtures as they are encountered.
Reading is now validated on two sheets of one CAD style; the untested cases are
scanned or skewed sheets, multi-sheet drawings, and — most importantly —
classification and abstention, which no result so far touches.

---

## Out of Scope

- **Multi-sheet drawings.** Sheet 1 only. The sample title blocks (`SHEET 1`, `ALL SHEETS ARE THE SAME REVISION`) imply multi-sheet drawings exist; handling them was explicitly deferred by the developer. The likely eventual approach is a full scan of sheet 1 plus notes-region-only scans of later sheets.
- **Subcontractor detection.** Excluded for lack of any textual anchor on a drawing. Remains manually filled.
- **Translating specifications into Hebrew.** Values are kept verbatim in the drawing's language.
- **Extracting anything beyond the six domains** — dimensions, tolerances, part numbers, revision, quantity, surface finish symbols, GD&T.
- **Modifying the email send flow.** Unchanged apart from the added one-time confirmation for unreviewed AI values.
- **Re-triggering extraction from anywhere other than the new-RFQ form and the manual re-scan control.**
- **A hard cost budget or spend enforcement.** Caching and the re-scan cap are the only cost controls in v1.
- **A per-user or per-account extraction toggle.** The flag is per-client only.
- **Deriving a mapping from a supplier's own terminology** or any cross-account learning. Learned mappings are strictly account-scoped.

---

## Further Notes

### Defense data disclosure — carried, not resolved

The sample drawings reference `MIL-PRF-8625`, `AMS-QQ-P-35`, and `MIL-STD-130`, and the project's own seed data names Elbit and Rafael. This feature transmits customer engineering drawings to Vercel AI Gateway, which forwards them to the model provider.

Depending on the confidentiality terms in place with those customers, that transmission may itself be a disclosure event — independently of the provider's retention or training policy, since it is the transmission and not the storage that such terms typically restrict. Vercel AI Gateway is zero-retention by default and paid API traffic to the major providers carries no-training terms, but these mitigate the storage question, not the disclosure one.

This was raised explicitly and the developer elected to proceed with the feature enabled by default. `clients.ai_extraction_enabled` exists so that a customer's objection can be honoured per-client in one statement rather than requiring a migration and a backfill conversation after the fact. **This is a mitigation, not a resolution**, and it is recorded here deliberately.

### The accuracy question — reading resolved, classification still open

~~The largest technical unknown is whether the two-pass native-resolution read is reliable on 8-point note text embedded in a ~2000 px raster.~~ **Answered.** Reading
small note text is not the bottleneck: a direct read of both sample PDFs recovered
every known line character-exact, at the cheapest model tier, in under 5 seconds.
The two-pass design built to solve this problem has been dropped.

**Classification and abstention have now been measured once** — see *Classification
results* above. Domain assignment was right first time on every unambiguous line;
abstention needed a prompt fix, because the model inferred `hardening` from a
temper code rather than from printed words. It remains the weaker half, and the
measurement covers two sheets of one CAD style. If reading regresses on a harder sheet (scanned, skewed, lower
resolution), the fallback ladder is: rasterise sheet 1 ourselves and send the page
as an image, then send fixed native-resolution tiles, then split reading from
classification across two models.

**A note on how the reading question got answered**, because the method
generalises better than the result. The spec asserted that direct PDF reading
"is expected to misread note text" — a prediction, written as though it were a
finding, that justified the feature's two most complex components. Testing it cost
about five cents and twenty minutes, and disproved it. It also incidentally caught
two wrong values that were already embedded in a ticket's acceptance criteria.
Prefer measuring a load-bearing assumption over building around it.

Since the feature ships enabled, validation of the classification half happens in
production on the first real RFQs rather than behind a flag. Findings from those
first uses should be recorded here.

### Hebrew domain labels

For reference when writing prompts and UI: `raw_material` = חומר גלם, `coating` = ציפוי, `passivation` = פסיבציה, `quenching` = חישול, `hardening` = חיסום, `subcontractor` = קבלן משנה. The spec-field labels differ from the domain labels and are defined separately in the types module.

### Interaction with the existing spec autocomplete

The RFQ page already offers spec-value suggestions drawn from previously used values across the account. Extraction should reuse an existing value verbatim where one matches, rather than emitting a near-miss variant — a fragmented vocabulary degrades that autocomplete over time. In practice the vocabulary starts empty, so this matters increasingly rather than immediately.
