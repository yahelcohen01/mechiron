-- Helper: get the account_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID AS $$
  SELECT account_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============ users ============
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (id = auth.uid());

-- ============ accounts ============
CREATE POLICY "Users can read own account"
  ON accounts FOR SELECT
  USING (id = public.get_user_account_id());

-- ============ clients ============
CREATE POLICY "Users can select clients in their account"
  ON clients FOR SELECT
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can insert clients in their account"
  ON clients FOR INSERT
  WITH CHECK (account_id = public.get_user_account_id());

CREATE POLICY "Users can update clients in their account"
  ON clients FOR UPDATE
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can delete clients in their account"
  ON clients FOR DELETE
  USING (account_id = public.get_user_account_id());

-- ============ suppliers ============
CREATE POLICY "Users can select suppliers in their account"
  ON suppliers FOR SELECT
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can insert suppliers in their account"
  ON suppliers FOR INSERT
  WITH CHECK (account_id = public.get_user_account_id());

CREATE POLICY "Users can update suppliers in their account"
  ON suppliers FOR UPDATE
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can delete suppliers in their account"
  ON suppliers FOR DELETE
  USING (account_id = public.get_user_account_id());

-- ============ client_supplier_approvals ============
CREATE POLICY "Users can select approvals for their clients"
  ON client_supplier_approvals FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can insert approvals for their clients"
  ON client_supplier_approvals FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can delete approvals for their clients"
  ON client_supplier_approvals FOR DELETE
  USING (client_id IN (SELECT id FROM clients WHERE account_id = public.get_user_account_id()));

-- ============ parts ============
CREATE POLICY "Users can select parts in their account"
  ON parts FOR SELECT
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can insert parts in their account"
  ON parts FOR INSERT
  WITH CHECK (account_id = public.get_user_account_id());

CREATE POLICY "Users can update parts in their account"
  ON parts FOR UPDATE
  USING (account_id = public.get_user_account_id());

-- ============ part_revisions ============
CREATE POLICY "Users can select revisions for their parts"
  ON part_revisions FOR SELECT
  USING (part_id IN (SELECT id FROM parts WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can insert revisions for their parts"
  ON part_revisions FOR INSERT
  WITH CHECK (part_id IN (SELECT id FROM parts WHERE account_id = public.get_user_account_id()));

-- ============ rfqs ============
CREATE POLICY "Users can select rfqs in their account"
  ON rfqs FOR SELECT
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can insert rfqs in their account"
  ON rfqs FOR INSERT
  WITH CHECK (account_id = public.get_user_account_id());

CREATE POLICY "Users can update rfqs in their account"
  ON rfqs FOR UPDATE
  USING (account_id = public.get_user_account_id());

-- ============ rfq_domain_configs ============
CREATE POLICY "Users can select domain configs for their rfqs"
  ON rfq_domain_configs FOR SELECT
  USING (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can insert domain configs for their rfqs"
  ON rfq_domain_configs FOR INSERT
  WITH CHECK (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can update domain configs for their rfqs"
  ON rfq_domain_configs FOR UPDATE
  USING (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));

-- ============ rfq_requests ============
CREATE POLICY "Users can select requests for their rfqs"
  ON rfq_requests FOR SELECT
  USING (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can insert requests for their rfqs"
  ON rfq_requests FOR INSERT
  WITH CHECK (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));

CREATE POLICY "Users can update requests for their rfqs"
  ON rfq_requests FOR UPDATE
  USING (rfq_id IN (SELECT id FROM rfqs WHERE account_id = public.get_user_account_id()));
