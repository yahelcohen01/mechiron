-- 006_add_hardening_domain.sql
-- Add a 6th RFQ domain: 'hardening' (חיסום).
-- Three tables carry an inline CHECK on `domain`; each auto-named
-- {table}_domain_check must be dropped and re-added with the new value.
-- Ordering mirrors RFQ_DOMAINS: raw_material, coating, passivation,
-- quenching, hardening, subcontractor.

ALTER TABLE suppliers
  DROP CONSTRAINT suppliers_domain_check,
  ADD CONSTRAINT suppliers_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'hardening', 'subcontractor'));

ALTER TABLE rfq_domain_configs
  DROP CONSTRAINT rfq_domain_configs_domain_check,
  ADD CONSTRAINT rfq_domain_configs_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'hardening', 'subcontractor'));

ALTER TABLE rfq_requests
  DROP CONSTRAINT rfq_requests_domain_check,
  ADD CONSTRAINT rfq_requests_domain_check
    CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'hardening', 'subcontractor'));
