# 0003 — Unassigned findings show the verbatim line, not a cropped image

**Status:** accepted
**Date:** decided 2026-08-03, implemented and recorded 2026-09-15
**Issues:** #16 (the card), #11 (the rasteriser, closed) · user stories 12 and 13

## Context

The spec's user story 13 asked to *"see the cropped image region a value came from, so that I can
confirm an uncertain reading against the original pixels in a second"*. Issue #16 specified each
unassigned finding rendering next to that crop, and left one decision open: re-rasterise the crop on
demand from the finding's saved bbox, or persist it as an image at extraction time.

Both branches of that decision depended on infrastructure that no longer exists. The crops came from
the server-side rasteriser in **#11**, which was closed after PR #26 disproved its accuracy premise:
the two-pass locate/read design existed to avoid a downscale that does not occur, so rasterisation
was removed from the pipeline entirely. `pdfjs-dist` came out with it.

The state of the code when #16 came up for implementation:

- `DrawingFinding` carries **no `page` and no `bbox`** — no positional data at all
- nothing writes either column; `rfq_drawing_findings.bbox` exists and is always NULL
- zero `bbox` references anywhere in `src/`
- no `pdfjs-dist` dependency

So the ticket's open decision had **no valid answer in either branch**. Answering it as written meant
reinstating #11.

The decision was taken on 2026-08-03 and recorded as a comment on #16 — but **the ticket body was
never edited**, so the body continued to specify crops for six weeks. A reconciliation comment was
posted 2026-09-15 before implementation began.

## Decision

**The card shows the verbatim line the model read.** No crop, no bbox, no rasteriser, no image
storage.

This leans on user story 12, which the pipeline already satisfies: *"see the exact line of text on
the drawing that produced a value, so that I can verify it without opening the PDF."* The validation
run showed those lines come back character-exact, including long ones like
`BAKE PART AFTER PLATING WITHIN 3 HOURS PER ASTM B850 CLASS ER-9`.

Presentation detail that is load-bearing: the line renders `dir="ltr"` in a monospace face inside an
RTL page. These are Latin specification codes, and bidi reordering is exactly what makes a misread
character impossible to spot.

## Consequences

**Makes easy:** the card is thin glue over data the pipeline already returns — no new dependency, no
image storage, no coordinate system tied to a page the model provider rendered rather than one we
control.

**Makes hard:** verifying a genuinely ambiguous *character* — a `0` against an `O`, a smudged digit.
The text is the model's reading; if the reading is wrong, the text is wrong in the same way, and
nothing on the card contradicts it.

**Forbids:** reintroducing `pdfjs-dist` for this card without reopening #11. The spec's note stands:
rasterisation "retains a possible role in UI surfaces only… Do not build it until one of those
surfaces is designed and needs it."

**Revisit if** real use shows the text alone is not enough — for instance if low-confidence findings
turn out to need pixel-level checking. At that point reopen #11 scoped narrowly to this card, and the
bounding-box question comes back with it.

## Alternatives rejected

**Reinstate the rasteriser for this card alone.** Rejected: it restores a whole subsystem — Node
rasterisation, `/Rotate` handling, bbox persistence or on-demand cropping, an image coordinate system
— to add pixels next to text that is already character-exact. The verification value of the crop over
the text is small; the infrastructure is not.

**Persist crops as images at extraction time.** Rejected with the above, and separately: extraction
deliberately writes nothing to storage, which is what let the staging prefix, the second upload and
the 24-hour sweeper all be deleted from the design.

**Render the crop client-side from the PDF the browser already has.** Not fully rejected — this is
the cheapest future route if the revisit trigger fires, since the page already holds a signed URL to
the drawing. It was not built because it still needs bounding boxes, which the model does not return.

## Related

The same trap — a ticket body describing a superseded design while the correction lives elsewhere —
applies to **#15**, whose text still describes the two-pass read, 8–15 s latency and a
"locating the notes block" stage. Reconcile before building. There, the correction sits in the spec's
strike-throughs; here it sat in a comment.
