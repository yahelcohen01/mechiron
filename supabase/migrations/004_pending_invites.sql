-- ============ pending_invites table ============
CREATE TABLE pending_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       UUID NOT NULL DEFAULT gen_random_uuid(),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE (account_id, email)
);

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pending_invites_account_id ON pending_invites(account_id);
CREATE INDEX idx_pending_invites_token ON pending_invites(token);

-- ============ RLS: pending_invites ============
CREATE POLICY "Users can select invites in their account"
  ON pending_invites FOR SELECT
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can insert invites in their account"
  ON pending_invites FOR INSERT
  WITH CHECK (account_id = public.get_user_account_id());

CREATE POLICY "Users can update invites in their account"
  ON pending_invites FOR UPDATE
  USING (account_id = public.get_user_account_id());

CREATE POLICY "Users can delete invites in their account"
  ON pending_invites FOR DELETE
  USING (account_id = public.get_user_account_id());

-- ============ RLS: accounts — add UPDATE policy ============
CREATE POLICY "Users can update own account"
  ON accounts FOR UPDATE
  USING (id = public.get_user_account_id());

-- ============ RLS: users — add same-account SELECT policy ============
CREATE POLICY "Users can read members in their account"
  ON users FOR SELECT
  USING (account_id = public.get_user_account_id());
