# 0004 — Quotes live as columns on `rfq_requests`, not a separate table

**Status:** accepted — **not yet implemented.** Migration `012` is the next step.
**Date:** 2026-09-17

## Context

The end-to-end flow stops before its own purpose. Tracing it:

```
signup → client → supplier → approve → new RFQ → upload → spec → add suppliers
  → email sent ✅
  → supplier replies with a price, by email, into the user's inbox
  → ❌ nowhere in the app to record it
  → the user marks the RFQ "completed" by hand
```

There is **no quotes table**. `rfq_requests.status` is only `'pending' | 'sent'`. The app is called
מחירון — a price list — and there is nowhere to put a price, so nothing can be compared. Prices live
in the user's inbox and, presumably, a spreadsheet.

This was raised by the user after talking to customers: the priority is a working core flow before
any further extraction work. Suppliers reply **by email**; the user types the price in.

## Decision

**Add quote columns to `rfq_requests`.** One supplier's quote for one RFQ is one row, which is the
shape the table already has.

```sql
ALTER TABLE rfq_requests
  ADD COLUMN quoted_price   NUMERIC(12,2) CHECK (quoted_price >= 0),
  ADD COLUMN quoted_at      TIMESTAMPTZ,
  ADD COLUMN lead_time_days INTEGER CHECK (lead_time_days > 0),
  ADD COLUMN quote_notes    TEXT;
-- and extend the status CHECK to 'pending' | 'sent' | 'quoted'
```

Currency is **₪ only** for now — no currency column. Adding one later is additive; guessing at
multi-currency before a supplier has quoted in dollars is not.

`NUMERIC`, never a float: this is money.

## Consequences

**Makes easy:** entering a price is an UPDATE on a row that already exists, scoped by the RLS
policies `rfq_requests` already has. No new table, no new policies, no join to display a quote next
to the supplier who gave it.

**Makes hard:** price history. A supplier who revises a quote overwrites the old one. If revisions
need to be auditable, this decision has to be superseded — see below.

**Forbids nothing structurally.** A `rfq_quotes` table can be added later beside these columns and
backfilled from them; the columns then become a cache or are dropped.

**Requires** extending the `status` CHECK, which is an `ALTER TABLE … DROP CONSTRAINT / ADD
CONSTRAINT` pair — the same shape as migration `006`, which added the `hardening` domain to three
CHECK constraints. Follow `006` as the precedent.

**Depends on** decision [0001](./0001-check-row-counts-not-just-errors.md): the quote write is a
user-visible write, so it must verify its row count.

## Alternatives rejected

**A separate `rfq_quotes` table**, one row per quote, FK to `rfq_requests`. Rejected for now:
it buys price history at the cost of four new RLS policies, a new scoping path to get wrong, and a
join on every display. The existing `UNIQUE (rfq_id, supplier_id)` on `rfq_requests` already
expresses "one supplier appears once per RFQ", so a one-to-many quote table would contradict a
constraint the schema already chose. Realistically a revised price is an edit, not an audit trail —
until a customer says otherwise.

**A public link in the supplier email where the supplier enters their own price.** Rejected for now,
and worth revisiting: it removes the typing entirely, but needs a public, unauthenticated page, a
token scheme, its own RLS story, and spam handling. The user confirmed suppliers reply by email
today, so this solves a problem that does not exist yet.

**Reusing `rfq_domain_configs`.** Rejected outright: a quote is per *supplier*, that table is per
*domain*.

## Open questions for implementation

- Are `lead_time_days` and `quote_notes` worth having, or is price alone enough? Asked, not yet
  answered. They are cheap to add now and awkward to add once the UI exists.
- Where does "cheapest quote" surface — the domain section only, or also the dashboard?
- Does recording a quote change the RFQ's own status, or only the request's?
