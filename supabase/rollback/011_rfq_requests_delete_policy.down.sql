-- Rollback 011: remove the rfq_requests DELETE policy.
--
-- Reverting restores the pre-011 behaviour, which is the bug: with RLS enabled
-- and no DELETE policy, deletes against rfq_requests silently affect zero rows
-- and report success. Only roll back if 011 itself is the problem.

DROP POLICY IF EXISTS "Users can delete requests for their rfqs" ON rfq_requests;
