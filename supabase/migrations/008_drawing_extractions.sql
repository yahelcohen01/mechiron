-- 008_drawing_extractions.sql
-- Drawing auto-detection: three new tables. Purely additive — no existing
-- table, column, policy, or constraint is touched.
--
-- Unlike 002, RLS is ENABLED here in the same migration that creates the
-- policies. 002 created policies but never ran ENABLE ROW LEVEL SECURITY,
-- which left every table open via PostgREST until 007 fixed it. Not repeating
-- that: each table below is created, policied, and enabled together.
--
-- Policies call (SELECT public.get_user_account_id()) rather than
-- public.get_user_account_id(). The subquery form is evaluated once per
-- statement instead of once per row. Existing policies from 002 use the
-- unwrapped form; those are left alone, but new tables get the faster shape.

-- ============================================================
-- rfq_drawing_extractions
-- ============================================================
-- One row per extraction attempt against one drawing file.
--
-- rfq_id IS NULLABLE AND MUST STAY THAT WAY. Extraction fires when the user
-- selects a file on the new-RFQ form, which is before the RFQ exists. The row
-- is created RFQ-less and linked once the RFQ is created. A NOT NULL here
-- breaks the trigger point the whole feature is built on.
CREATE TABLE rfq_drawing_extractions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id       UUID REFERENCES rfqs(id) ON DELETE CASCADE,
  account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_hash    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'failed')),
  model        TEXT,
  raw_response JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_rfq_drawing_extractions_account_id ON rfq_drawing_extractions(account_id);
CREATE INDEX idx_rfq_drawing_extractions_rfq_id ON rfq_drawing_extractions(rfq_id);

-- Cache lookup: "has this account already extracted this exact file?"
-- account_id leads because it is the multi-tenant filter present in every
-- query. Deliberately NOT unique — a manual re-scan (#19) intentionally
-- creates a second row for the same (account_id, file_hash).
CREATE INDEX idx_rfq_drawing_extractions_cache
  ON rfq_drawing_extractions(account_id, file_hash);

ALTER TABLE rfq_drawing_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select extractions in their account"
  ON rfq_drawing_extractions FOR SELECT
  USING (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can insert extractions in their account"
  ON rfq_drawing_extractions FOR INSERT
  WITH CHECK (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can update extractions in their account"
  ON rfq_drawing_extractions FOR UPDATE
  USING (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can delete extractions in their account"
  ON rfq_drawing_extractions FOR DELETE
  USING (account_id = (SELECT public.get_user_account_id()));

-- ============================================================
-- rfq_drawing_findings
-- ============================================================
-- One row per specification the model read off the drawing.
--
-- domain NULL means unassigned: the model either abstained or read the text
-- with low confidence. Those surface in the unassigned-findings card (#16)
-- rather than auto-filling a field.
--
-- No account_id column: findings are reached through their extraction, and
-- the RLS policies below scope them that way. This mirrors how
-- client_supplier_approvals is scoped through clients in 002.
CREATE TABLE rfq_drawing_findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id     UUID NOT NULL REFERENCES rfq_drawing_extractions(id) ON DELETE CASCADE,
  label             TEXT,
  text              TEXT NOT NULL,
  confidence        TEXT NOT NULL CHECK (confidence IN ('high', 'low')),
  page              INTEGER NOT NULL DEFAULT 1 CHECK (page > 0),
  bbox              JSONB,
  domain            TEXT CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'hardening', 'subcontractor')),
  assignment_source TEXT CHECK (assignment_source IN ('auto', 'learned', 'user')),
  applied           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing the FK is what makes the ON DELETE CASCADE from an extraction fast
-- rather than a sequential scan of every finding in the table.
CREATE INDEX idx_rfq_drawing_findings_extraction_id ON rfq_drawing_findings(extraction_id);

ALTER TABLE rfq_drawing_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select findings in their account"
  ON rfq_drawing_findings FOR SELECT
  USING (extraction_id IN (
    SELECT id FROM rfq_drawing_extractions
    WHERE account_id = (SELECT public.get_user_account_id())
  ));

CREATE POLICY "Users can insert findings in their account"
  ON rfq_drawing_findings FOR INSERT
  WITH CHECK (extraction_id IN (
    SELECT id FROM rfq_drawing_extractions
    WHERE account_id = (SELECT public.get_user_account_id())
  ));

CREATE POLICY "Users can update findings in their account"
  ON rfq_drawing_findings FOR UPDATE
  USING (extraction_id IN (
    SELECT id FROM rfq_drawing_extractions
    WHERE account_id = (SELECT public.get_user_account_id())
  ));

CREATE POLICY "Users can delete findings in their account"
  ON rfq_drawing_findings FOR DELETE
  USING (extraction_id IN (
    SELECT id FROM rfq_drawing_extractions
    WHERE account_id = (SELECT public.get_user_account_id())
  ));

-- ============================================================
-- account_spec_mappings
-- ============================================================
-- Learned classifications. Assigning an unassigned finding to a domain writes
-- one of these; later extractions inject them into the prompt so the same
-- specification classifies itself.
--
-- UNIQUE (account_id, pattern) makes assignment an upsert: teaching the system
-- the same pattern twice updates the domain and does not accumulate rows. It
-- also means re-teaching a pattern to a DIFFERENT domain corrects the old
-- answer rather than leaving two contradictory rules in the prompt.
--
-- Strictly account-scoped: no cross-account learning, by design.
CREATE TABLE account_spec_mappings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  pattern    TEXT NOT NULL,
  domain     TEXT NOT NULL CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'hardening', 'subcontractor')),
  hit_count  INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, pattern)
);

-- The UNIQUE constraint's index already leads with account_id, so a separate
-- index on account_id alone would be redundant.

ALTER TABLE account_spec_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select spec mappings in their account"
  ON account_spec_mappings FOR SELECT
  USING (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can insert spec mappings in their account"
  ON account_spec_mappings FOR INSERT
  WITH CHECK (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can update spec mappings in their account"
  ON account_spec_mappings FOR UPDATE
  USING (account_id = (SELECT public.get_user_account_id()));

CREATE POLICY "Users can delete spec mappings in their account"
  ON account_spec_mappings FOR DELETE
  USING (account_id = (SELECT public.get_user_account_id()));
