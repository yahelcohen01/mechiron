-- 008_drawing_extractions.down.sql  (ROLLBACK — apply manually, NOT via db push)
--
-- Reverts 008_drawing_extractions.sql by dropping the three new tables.
--
--   psql "$DB_URL" -f supabase/rollback/008_drawing_extractions.down.sql
--
-- RUN 009's down file FIRST. This one comes off second.
--
-- Nothing outside this feature references these tables, so the drops are
-- clean. Policies and indexes go with their tables automatically; they do not
-- need separate statements.
--
-- WHAT YOU LOSE: every extraction, every finding, and — the one that does not
-- come back — every learned spec mapping the user taught the system by hand.
-- If you expect to restore the feature, dump the mappings first:
--
--   \copy (SELECT account_id, pattern, domain, hit_count FROM account_spec_mappings)
--     TO 'spec_mappings_backup.csv' CSV HEADER
--
-- The application is required to tolerate these tables being absent and
-- degrade to "found nothing" rather than erroring the RFQ page, so running
-- this against a deployment still serving the new code is safe by design.
-- That degradation is what makes the schema rollback independent of the code
-- rollback — if it does not hold, fix the code path rather than reinstating
-- the tables.
--
-- Storage is not covered here. Delete the staged scratch files separately:
--   the {account_id}/_pending/ prefix in the `drawings` bucket.
--
-- After running this, also delete the migration row so a future `supabase db
-- push` can re-apply the (corrected) forward migration:
--   DELETE FROM supabase_migrations.schema_migrations WHERE version = '008';

-- Order matters: findings reference extractions.
DROP TABLE IF EXISTS rfq_drawing_findings;
DROP TABLE IF EXISTS rfq_drawing_extractions;
DROP TABLE IF EXISTS account_spec_mappings;
