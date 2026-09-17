# Decision records

One file per decision that outlived the conversation that produced it.

Feature specs in [`../development/`](../development/) already record decisions *within* a feature.
This folder is for the other kind: decisions that **cross features**, that **constrain future work**,
or that **reverse an earlier decision** — where the reasoning needs a home that is not buried in a
spec for something else.

## When to write one

Write a record when at least one of these is true:

- the decision affects code in more than one feature
- a future contributor would reasonably choose differently without knowing why
- it was **paid for** — a bug, an outage, a wasted week, a billed measurement
- it rejects an alternative that will keep looking attractive

Do **not** write one for something the code already states clearly, or for a choice with no live
alternative. A record that only restates a function's docstring is noise.

## Format

`NNNN-kebab-case-title.md`, numbered in order of decision. Each record carries:

| Section | Purpose |
|---|---|
| **Status** | `accepted`, `superseded by NNNN`, or `reversed` — never deleted |
| **Date** | when it was decided, not when it was written up |
| **Context** | what was true that forced a choice |
| **Decision** | what was chosen, stated so it can be checked against the code |
| **Consequences** | what this makes easy, what it makes hard, what it forbids |
| **Alternatives rejected** | and why — this is the part that stops the decision being re-litigated |

**Records are append-only.** A decision that turns out wrong gets a new record and a `superseded by`
line on the old one. Never edit a record to say something it did not say — the same rule that governs
[`../../supabase/migrations/`](../../supabase/migrations/), for the same reason: the history is the
value.

## Index

| # | Decision | Status |
|---|---|---|
| [0001](./0001-check-row-counts-not-just-errors.md) | A write that reports success is not evidence it wrote | accepted |
| [0002](./0002-extraction-model-and-reasoning-budget.md) | Ship `gemini-3-flash` at `reasoning: 'low'` | accepted |
| [0003](./0003-unassigned-findings-show-text-not-crops.md) | Unassigned findings show the verbatim line, not a cropped image | accepted |
| [0004](./0004-quotes-as-columns-on-rfq-requests.md) | Quotes live as columns on `rfq_requests`, not a separate table | accepted |
