# 0001 — A write that reports success is not evidence it wrote

**Status:** accepted
**Date:** 2026-09-15
**Paid for by:** six weeks of silently discarded deletes (issue #35), and a month of silently dropped
writes before that (issue #010 / migration `010`)

## Context

`rfq_requests` had SELECT, INSERT and UPDATE policies from migration `002`, but no DELETE policy.
Migration `007` then enabled row-level security on 2026-07-31.

From that moment every delete against the table matched **zero rows**. Postgres raises no error when
no policy permits an operation — the statement is legal, it simply affects nothing. PostgREST
therefore returned 200, the server action returned `{ success: true }`, and the UI reported success.
Unchecking a supplier did nothing, silently, for six weeks. It was found by accident, by a human
clicking a checkbox while verifying an unrelated feature.

The same shape had already cost this project once: a column renamed by editing an applied migration
in place meant findings were written to a column that did not exist, and no error surfaced across
three issues.

The generalisation is not about RLS. It is that **in this stack, several distinct failures are
indistinguishable from success at the call site**:

- no policy permits the operation (RLS)
- the predicate matched no rows
- the column does not exist on the remote, but the client sends it anyway
- the row was already deleted by a concurrent request

## Decision

**Any write whose effect the user will believe must be verified by its row count, not by the absence
of an error.**

In practice, for Supabase/PostgREST:

```ts
const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
if (error) return { success: false, error: error.message };
if (!data || data.length === 0) return { success: false, error: /* … */ };
```

Three rules follow:

1. **`.select()` on every `delete()` and `update()`** whose success is reported to a user. The
   returned rows are the only signal available.
2. **Never discard an `ActionResult`.** A caller that ignores the result re-creates the bug one layer
   up — which is exactly what `handleRemoveSupplier` did before #35.
3. **Report, do not throw, from inside a transition.** `SupplierRow` calls its handler without
   awaiting; a throw there is an invisible unhandled rejection.

A write whose failure is genuinely harmless — a learned mapping, a log-shaped row — may skip this,
but must say so in a comment and degrade visibly rather than silently. See
`assignFindingToDomain`'s handling of `account_spec_mappings` for the intended shape.

## Consequences

**Makes easy:** a failing write becomes a visible error at the moment it fails, for the whole class,
not just the instance that was found.

**Makes hard:** every reported write costs an extra round-trip's worth of returned columns, and the
code is wordier than the happy path deserves.

**Forbids:** treating `!error` as proof of effect anywhere a user is told something happened.

**Standing consequence:** six tables still lack DELETE policies (`rfqs`, `parts`, `part_revisions`,
`rfq_domain_configs`, `accounts`, `users`) — tracked in **#38**. Until that closes, any new delete
path is presumed broken until its row count is checked.

## Alternatives rejected

**Trust RLS to be complete, and audit policies instead of call sites.** Rejected: the policy audit is
worth doing (#38) but it is a point-in-time check, while the call-site check holds for every future
migration. `007` passed review and still produced this bug.

**A database trigger that raises when a delete affects no rows.** Rejected: it cannot distinguish "no
policy permits this" from "the row was legitimately already gone", and it would turn a benign
concurrent delete into an error.

**Wrap the Supabase client in a helper that always appends `.select()`.** Not rejected on merit —
this is a reasonable future refactor. It was not done because it changes every call site in the app
at once, and the failure it prevents is better understood per-call for now. Revisit if a third
instance of this bug appears.
