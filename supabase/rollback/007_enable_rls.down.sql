-- 007_enable_rls.down.sql  (ROLLBACK — apply manually, NOT via db push)
--
-- Reverts 007_enable_rls.sql by disabling RLS on the 10 public tables. The
-- policies themselves are left in place (they are inert while RLS is off).
--
--   psql "$DB_URL" -f supabase/rollback/007_enable_rls.down.sql
--
-- WARNING: this returns every public table to being fully readable and
-- writable by anyone holding the publishable key — the exact hole 007 closed.
-- Treat it as a stopgap of minutes, not days.
--
-- PREFER THE NARROWER FIX: if one code path broke, disable RLS on that ONE
-- table (or better, add the missing policy) rather than running this wholesale.
--
-- After running this, also delete the migration row so a future `supabase db
-- push` can re-apply the (corrected) forward migration:
--   DELETE FROM supabase_migrations.schema_migrations WHERE version = '007';

ALTER TABLE public.accounts                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_supplier_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_revisions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_domain_configs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests              DISABLE ROW LEVEL SECURITY;

-- Restore the pre-007 helper definition (unpinned search_path). Only needed if
-- the pinned search_path is itself implicated, which is unlikely.
-- CREATE OR REPLACE FUNCTION public.get_user_account_id()
-- RETURNS UUID AS $$
--   SELECT account_id FROM public.users WHERE id = auth.uid();
-- $$ LANGUAGE sql SECURITY DEFINER STABLE;
