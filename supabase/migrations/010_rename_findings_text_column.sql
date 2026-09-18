-- 010_rename_findings_text_column.sql
-- Repairs schema drift, not a design change.
--
-- 008 originally created `rfq_drawing_findings.text` and was applied to the
-- remote project in that form. Commit 6439bef then renamed the column to
-- `raw_text` by editing 008 in place, on the stated belief that "008/009 have
-- not been applied to the remote project, which is still at 007". That belief
-- was wrong: the remote had the pre-rename column, so every query naming
-- `raw_text` failed against it — silently, because both call sites fail closed.
--
-- The lesson, recorded here because the next person will be tempted the same
-- way: an applied migration is history and cannot be edited. A file that has
-- run somewhere is a record of what happened, not a description of what is
-- wanted. Corrections go in a new file.
--
-- Cheap and safe: RENAME COLUMN is metadata-only. It rewrites no rows, copies
-- no data, and takes only a brief ACCESS EXCLUSIVE lock on a table that is
-- currently empty. Data would survive it regardless — a rename cannot lose a
-- value.
--
-- WHY THE GUARD: this file also has to be replayable from scratch. On a fresh
-- project, 008 already creates the column as `raw_text` and an unconditional
-- rename would fail with "column text does not exist", breaking provisioning
-- of every new environment. The guard makes this migration do nothing when
-- the schema is already correct, so both paths converge on the same shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rfq_drawing_findings'
      AND column_name = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rfq_drawing_findings'
      AND column_name = 'raw_text'
  ) THEN
    -- Quoted: `text` is a type name, which is the reason it is being renamed.
    ALTER TABLE rfq_drawing_findings RENAME COLUMN "text" TO raw_text;
  END IF;
END $$;
