-- Seed data for development
-- Run after applying 001_initial_schema.sql

-- Test account
INSERT INTO accounts (id, name, sender_email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'מפעל דוגמה בע"מ', 'quotes@example.com');

-- Test user (link to your Supabase Auth user ID after signup)
-- INSERT INTO users (id, account_id, full_name, email, role) VALUES
--   ('<your-auth-user-id>', 'a0000000-0000-0000-0000-000000000001', 'משתמש מנהל', 'admin@example.com', 'admin');

-- Clients
INSERT INTO clients (id, account_id, name, contact_name, contact_email, contact_phone) VALUES
  ('c0000000-0000-0000-0000-c00000000001', 'a0000000-0000-0000-0000-000000000001', 'אלביט מערכות', 'יוסי כהן', 'yossi@elbit.example.com', '050-1234567'),
  ('c0000000-0000-0000-0000-c00000000002', 'a0000000-0000-0000-0000-000000000001', 'רפאל', 'דנה לוי', 'dana@rafael.example.com', '052-9876543');

-- Suppliers (6 total: one per domain + one extra raw_material)
INSERT INTO suppliers (id, account_id, name, contact_name, email, phone, domain) VALUES
  ('50000000-0000-0000-0000-500000000001', 'a0000000-0000-0000-0000-000000000001', 'מתכות ישראל', 'אבי', 'avi@metals.example.com', '03-1111111', 'raw_material'),
  ('50000000-0000-0000-0000-500000000002', 'a0000000-0000-0000-0000-000000000001', 'פלדות השרון', 'מיכל', 'michal@steel.example.com', '09-2222222', 'raw_material'),
  ('50000000-0000-0000-0000-500000000003', 'a0000000-0000-0000-0000-000000000001', 'ציפויי הדרום', 'רון', 'ron@coating.example.com', '08-3333333', 'coating'),
  ('50000000-0000-0000-0000-500000000004', 'a0000000-0000-0000-0000-000000000001', 'פסיבציה פלוס', 'שירה', 'shira@passivation.example.com', '04-4444444', 'passivation'),
  ('50000000-0000-0000-0000-500000000005', 'a0000000-0000-0000-0000-000000000001', 'חישול מדויק', 'עמית', 'amit@quench.example.com', '02-5555555', 'quenching'),
  ('50000000-0000-0000-0000-500000000006', 'a0000000-0000-0000-0000-000000000001', 'קבלנות אורן', 'אורן', 'oren@sub.example.com', '077-6666666', 'subcontractor');

-- Approvals: Elbit approves metals + coating, Rafael approves steel + passivation
INSERT INTO client_supplier_approvals (client_id, supplier_id) VALUES
  ('c0000000-0000-0000-0000-c00000000001', '50000000-0000-0000-0000-500000000001'),
  ('c0000000-0000-0000-0000-c00000000001', '50000000-0000-0000-0000-500000000003'),
  ('c0000000-0000-0000-0000-c00000000002', '50000000-0000-0000-0000-500000000002'),
  ('c0000000-0000-0000-0000-c00000000002', '50000000-0000-0000-0000-500000000004');
