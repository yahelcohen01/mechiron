-- 011: DELETE policy for rfq_requests
--
-- `002` created SELECT, INSERT and UPDATE policies for rfq_requests but no
-- DELETE policy. `007` then enabled row-level security on the table. From that
-- moment every delete matched zero rows: Postgres does not error when no policy
-- permits the operation, it simply finds nothing to delete, and PostgREST
-- reports a successful delete of nothing.
--
-- The visible symptom was unchecking a supplier in a domain section appearing
-- to do nothing — the row survived a full page reload while the server action
-- returned 200. See issue #35.
--
-- Additive and reversible: one policy, no schema change, no data migration.
--
-- Two deliberate departures from the style of the policies already in `002`:
--
--   1. `TO authenticated` — `002`'s policies apply to PUBLIC, which silently
--      includes `anon`. The predicate denies anonymous callers anyway, since
--      get_user_account_id() returns NULL without a session and `account_id =
--      NULL` is never true, but naming the role states the intent rather than
--      relying on that.
--
--   2. `(SELECT public.get_user_account_id())` rather than a bare call. Wrapped
--      in a subquery the planner evaluates it once as an InitPlan; called
--      directly it is re-evaluated per candidate row. The function is STABLE so
--      this is purely a performance distinction, not a correctness one.
--      Supabase documents it as the single highest-impact RLS policy pattern.
--
-- `002`'s existing policies still use the unwrapped form. They are left alone
-- here: rewriting working policies is a separate change with its own risk, and
-- this migration exists to fix a bug, not to refactor.
--
-- The predicate is otherwise identical to the table's SELECT policy, so a user
-- can delete exactly the rows they can already see — the account boundary.
-- `rfq_id` is indexed (`idx_rfq_requests_rfq_id`, from `001`), which the
-- subquery relies on.
--
-- Note: this deliberately does NOT restrict deletion to `status = 'pending'`.
-- That rule belongs to the application (`removeSupplierFromRfq` already filters
-- on it) and encoding it here would mean a future legitimate delete of a sent
-- request fails the same silent way this migration is fixing.

DROP POLICY IF EXISTS "Users can delete requests for their rfqs" ON rfq_requests;

CREATE POLICY "Users can delete requests for their rfqs"
  ON rfq_requests FOR DELETE
  TO authenticated
  USING (
    rfq_id IN (
      SELECT id FROM rfqs WHERE account_id = (SELECT public.get_user_account_id())
    )
  );
