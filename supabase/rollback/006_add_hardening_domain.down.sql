-- 006_add_hardening_domain.down.sql  (ROLLBACK — apply manually, NOT via db push)
--
-- Reverts 006_add_hardening_domain.sql by restoring the original 5-value
-- CHECK constraints (drops 'hardening').
--
--   psql "$DB_URL" -f supabase/rollback/006_add_hardening_domain.down.sql
--
-- PRECONDITION: no rows may reference domain = 'hardening', or the ADD
-- CONSTRAINT will fail. Reassign or delete those rows first:
--   SELECT 'suppliers' t, count(*) FROM suppliers WHERE domain='hardening'
--   UNION ALL SELECT 'rfq_domain_configs', count(*) FROM rfq_domain_configs WHERE domain='hardening'
--   UNION ALL SELECT 'rfq_requests', count(*) FROM rfq_requests WHERE domain='hardening';
--
-- After running this, also delete the migration row so a future `supabase db
-- push` can re-apply the (corrected) forward migration:
--   DELETE FROM supabase_migrations.schema_migrations WHERE version = '006';

ALTER TABLE suppliers
  DROP CONSTRAINT suppliers_domain_check,
  ADD CONSTRAINT suppliers_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor'));

ALTER TABLE rfq_domain_configs
  DROP CONSTRAINT rfq_domain_configs_domain_check,
  ADD CONSTRAINT rfq_domain_configs_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor'));

ALTER TABLE rfq_requests
  DROP CONSTRAINT rfq_requests_domain_check,
  ADD CONSTRAINT rfq_requests_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor'));
