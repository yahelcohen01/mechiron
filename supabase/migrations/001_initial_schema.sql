-- Updated at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- accounts
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_account_id ON users(account_id);

-- clients
CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name)
);

CREATE INDEX idx_clients_account_id ON clients(account_id);

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- suppliers
CREATE TABLE suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  contact_name TEXT,
  email        TEXT NOT NULL,
  phone        TEXT,
  domain       TEXT NOT NULL CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, name, domain)
);

CREATE INDEX idx_suppliers_account_id ON suppliers(account_id);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- client_supplier_approvals
CREATE TABLE client_supplier_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, supplier_id)
);

CREATE INDEX idx_client_supplier_approvals_client_id ON client_supplier_approvals(client_id);
CREATE INDEX idx_client_supplier_approvals_supplier_id ON client_supplier_approvals(supplier_id);

-- parts
CREATE TABLE parts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, serial_number)
);

CREATE INDEX idx_parts_account_id ON parts(account_id);
CREATE INDEX idx_parts_client_id ON parts(client_id);

CREATE TRIGGER set_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- part_revisions
CREATE TABLE part_revisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id         UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL CHECK (revision_number >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (part_id, revision_number)
);

CREATE INDEX idx_part_revisions_part_id ON part_revisions(part_id);

-- rfqs
CREATE TABLE rfqs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  part_revision_id UUID NOT NULL REFERENCES part_revisions(id) ON DELETE RESTRICT,
  base_quantity    INTEGER NOT NULL CHECK (base_quantity > 0),
  drawing_url      TEXT,
  drawing_filename TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rfqs_account_id ON rfqs(account_id);
CREATE INDEX idx_rfqs_part_revision_id ON rfqs(part_revision_id);

CREATE TRIGGER set_rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- rfq_domain_configs
CREATE TABLE rfq_domain_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id           UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  domain           TEXT NOT NULL CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor')),
  quantity_override INTEGER CHECK (quantity_override > 0),
  email_subject    TEXT,
  email_body_text  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfq_id, domain)
);

CREATE INDEX idx_rfq_domain_configs_rfq_id ON rfq_domain_configs(rfq_id);

CREATE TRIGGER set_rfq_domain_configs_updated_at
  BEFORE UPDATE ON rfq_domain_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- rfq_requests
CREATE TABLE rfq_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id              UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  domain              TEXT NOT NULL CHECK (domain IN ('raw_material', 'coating', 'passivation', 'quenching', 'subcontractor')),
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  sent_at             TIMESTAMPTZ,
  is_approved_supplier BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfq_id, supplier_id)
);

CREATE INDEX idx_rfq_requests_rfq_id ON rfq_requests(rfq_id);
CREATE INDEX idx_rfq_requests_supplier_id ON rfq_requests(supplier_id);
