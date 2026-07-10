-- ============================================================
-- 005_storage_drawings.sql
-- Captures the `drawings` Storage bucket + its RLS policies as a
-- migration so the setup is reproducible across projects/regions
-- (previously created manually via the Supabase dashboard).
--
-- Storage path convention (see rfq/new/actions.ts):
--   {account_id}/{rfq_id}/{original_filename}
-- ============================================================

-- ---------- Bucket ----------
-- Private bucket (public = false). Accessed via signed URLs / service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', false)
ON CONFLICT (id) DO NOTHING;

-- ---------- RLS policies on storage.objects ----------
-- RLS is already enabled on storage.objects by Supabase.
-- Policies below reproduce the live setup: any authenticated user may
-- insert / select / delete objects in the `drawings` bucket.
--
-- NOTE: these are intentionally broad (not account-scoped). Multi-tenant
-- isolation for drawings is enforced at the application layer via the
-- {account_id}/... path prefix, not in these policies. If we later want
-- to enforce account scoping in Storage itself, that is a separate,
-- deliberate migration.

DROP POLICY IF EXISTS "Authenticated users can upload drawings" ON storage.objects;
CREATE POLICY "Authenticated users can upload drawings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'drawings');

DROP POLICY IF EXISTS "Authenticated users can read drawings" ON storage.objects;
CREATE POLICY "Authenticated users can read drawings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'drawings');

DROP POLICY IF EXISTS "Authenticated users can delete drawings" ON storage.objects;
CREATE POLICY "Authenticated users can delete drawings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'drawings');
