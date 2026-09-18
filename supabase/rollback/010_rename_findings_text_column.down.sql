-- 010_rename_findings_text_column.down.sql
-- Puts the column back to the name the remote project carried before 010.
--
-- Guarded in the same way and for the same reason as the up migration: on a
-- project provisioned from the current migrations folder the column was never
-- called `text`, and reverting 010 there should leave the schema alone rather
-- than rename a column the code still needs.
--
-- Note that running this WILL break the application code, which names
-- `raw_text` throughout. It exists to restore a known prior state, not to
-- produce a working system on its own — roll the code back with it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rfq_drawing_findings'
      AND column_name = 'raw_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rfq_drawing_findings'
      AND column_name = 'text'
  ) THEN
    ALTER TABLE rfq_drawing_findings RENAME COLUMN raw_text TO "text";
  END IF;
END $$;
