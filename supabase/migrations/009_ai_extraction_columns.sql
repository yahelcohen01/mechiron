-- 009_ai_extraction_columns.sql
-- Drawing auto-detection: two new columns on existing tables.
--
-- Kept separate from 008 so it can be reverted independently, and so the
-- revert order is unambiguous: 009 comes off before 008, because nothing
-- should reference a dropped object mid-way.
--
-- Purely additive. No column type is altered, nothing is dropped, no data
-- migration runs, and neither `rfqs`, `parts`, nor the send flow is touched.

-- The kill switch. One statement disables extraction for every client:
--   UPDATE clients SET ai_extraction_enabled = false;
--
-- NOT NULL DEFAULT true is metadata-only on Postgres 11+ — the default is
-- stored in the catalogue rather than written into every existing row, so
-- this does not rewrite the table and does not take a long lock.
--
-- Defaults to true because the feature ships enabled (see the spec's Rollout
-- section); this column is how a specific customer's confidentiality
-- objection gets honoured without a migration and a backfill.
ALTER TABLE clients
  ADD COLUMN ai_extraction_enabled BOOLEAN NOT NULL DEFAULT true;

-- Marks where a spec value came from. NULL means the column predates
-- extraction or was never written by either path.
--
-- This is what makes an AI-written value identifiable, and therefore
-- bulk-clearable during a rollback. Without it an AI fill is indistinguishable
-- from a hand-typed one and the rollback has nothing to target.
ALTER TABLE rfq_domain_configs
  ADD COLUMN spec_source TEXT CHECK (spec_source IN ('ai', 'user'));
