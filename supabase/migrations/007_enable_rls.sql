-- Fix: migration 002 created RLS policies but never enabled RLS on the tables,
-- leaving every public table wide open via PostgREST (linter: policy_exists_rls_disabled
-- + rls_disabled_in_public). Policies already exist; this just activates them.

ALTER TABLE public.accounts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_supplier_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_revisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_domain_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests              ENABLE ROW LEVEL SECURITY;

-- Harden the SECURITY DEFINER helper: pin search_path so it can't be hijacked
-- by a caller-controlled schema (linter: function_search_path_mutable).
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID AS $$
  SELECT account_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp;
