/**
 * PROTOTYPE — in-memory stand-in for Supabase. Wipe me.
 *
 * Mirrors the real shapes in src/lib/types/index.ts closely enough to feel real,
 * but nothing here touches a database. Mutations live in module memory and die
 * with the process — that is deliberate: this prototype is checking what the
 * agent's tool surface feels like, not whether persistence works.
 *
 * TENANCY NOTE (the thing worth staring at):
 * In the real app every query is scoped by account_id and RLS is the boundary.
 * Here CURRENT_ACCOUNT_ID simulates the account resolved from the authenticated
 * session. In production this would come from ctx.session.auth.current — see
 * scopedFor() below and the comment in each tool.
 */

export const CURRENT_ACCOUNT_ID = 'acct_demo_metalworks';
const OTHER_ACCOUNT_ID = 'acct_someone_else';

export const RFQ_DOMAINS = [
  'raw_material',
  'coating',
  'passivation',
  'quenching',
  'hardening',
  'subcontractor',
] as const;

export type RfqDomain = (typeof RFQ_DOMAINS)[number];

export const DOMAIN_LABELS_HE: Record<RfqDomain, string> = {
  raw_material: 'חומר גלם',
  coating: 'ציפוי',
  passivation: 'פסיבציה',
  quenching: 'חישול',
  hardening: 'חיסום',
  subcontractor: 'קבלן משנה',
};

export type Client = {
  id: string;
  account_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
};

export type Supplier = {
  id: string;
  account_id: string;
  name: string;
  email: string;
  domain: RfqDomain;
};

export type Part = {
  id: string;
  account_id: string;
  client_id: string;
  serial_number: string;
  description: string | null;
  latest_revision: number;
};

export type Rfq = {
  id: string;
  account_id: string;
  part_id: string;
  revision_number: number;
  base_quantity: number;
  notes: string | null;
  status: 'draft' | 'in_progress' | 'completed';
  domains: RfqDomain[];
  created_at: string;
};

export type RfqRequest = {
  id: string;
  rfq_id: string;
  supplier_id: string;
  domain: RfqDomain;
  status: 'pending' | 'sent';
  sent_at: string | null;
  is_approved_supplier: boolean;
};

export const clients: Client[] = [
  {
    id: 'cl_1',
    account_id: CURRENT_ACCOUNT_ID,
    name: 'אלביט מערכות',
    contact_name: 'רונית לוי',
    contact_email: 'ronit@example.com',
  },
  {
    id: 'cl_2',
    account_id: CURRENT_ACCOUNT_ID,
    name: 'תעשייה אווירית',
    contact_name: 'דוד כהן',
    contact_email: 'david@example.com',
  },
  {
    id: 'cl_3',
    account_id: CURRENT_ACCOUNT_ID,
    name: 'רפאל',
    contact_name: null,
    contact_email: null,
  },
  // Belongs to a different tenant. Every tool must refuse to see this.
  {
    id: 'cl_99',
    account_id: OTHER_ACCOUNT_ID,
    name: 'לקוח של חשבון אחר',
    contact_name: null,
    contact_email: null,
  },
];

export const suppliers: Supplier[] = [
  { id: 'sp_1', account_id: CURRENT_ACCOUNT_ID, name: 'מתכות הצפון', email: 'sales@north-metals.example', domain: 'raw_material' },
  { id: 'sp_2', account_id: CURRENT_ACCOUNT_ID, name: 'ברזל ופלדה בע"מ', email: 'orders@iron-steel.example', domain: 'raw_material' },
  { id: 'sp_3', account_id: CURRENT_ACCOUNT_ID, name: 'ציפויים מתקדמים', email: 'info@adv-coating.example', domain: 'coating' },
  { id: 'sp_4', account_id: CURRENT_ACCOUNT_ID, name: 'אנודייז ישראל', email: 'quotes@anodize.example', domain: 'coating' },
  { id: 'sp_5', account_id: CURRENT_ACCOUNT_ID, name: 'פסיבציה מרכז', email: 'contact@passiv.example', domain: 'passivation' },
  { id: 'sp_6', account_id: CURRENT_ACCOUNT_ID, name: 'טיפולי חום גליל', email: 'ht@galil-heat.example', domain: 'hardening' },
  { id: 'sp_99', account_id: OTHER_ACCOUNT_ID, name: 'ספק של חשבון אחר', email: 'nope@other.example', domain: 'coating' },
];

/** client_id -> supplier_ids the client has explicitly approved. */
export const clientSupplierApprovals: Record<string, string[]> = {
  cl_1: ['sp_1', 'sp_3', 'sp_5'],
  cl_2: ['sp_2', 'sp_4'],
  cl_3: [],
};

export const parts: Part[] = [
  { id: 'pt_1', account_id: CURRENT_ACCOUNT_ID, client_id: 'cl_1', serial_number: 'ELB-4471-A', description: 'תושבת אלומיניום', latest_revision: 3 },
  { id: 'pt_2', account_id: CURRENT_ACCOUNT_ID, client_id: 'cl_1', serial_number: 'ELB-5120', description: 'ציר פלדה', latest_revision: 1 },
  { id: 'pt_3', account_id: CURRENT_ACCOUNT_ID, client_id: 'cl_2', serial_number: 'IAI-88-C', description: null, latest_revision: 7 },
];

export const rfqs: Rfq[] = [];
export const rfqRequests: RfqRequest[] = [];

let seq = 100;
export const nextId = (prefix: string) => `${prefix}_${++seq}`;

/**
 * The single tenancy chokepoint. In the real app this is
 * `getAccountId()` reading the authenticated Supabase session; here it is a
 * constant. Everything a tool reads goes through this.
 */
export function scopedFor<T extends { account_id: string }>(rows: T[], accountId: string): T[] {
  return rows.filter((r) => r.account_id === accountId);
}

export function isApprovedSupplier(clientId: string, supplierId: string): boolean {
  return (clientSupplierApprovals[clientId] ?? []).includes(supplierId);
}

/** Dump everything the agent has touched, for the "surface the state" rule. */
export function snapshot() {
  return {
    account_id: CURRENT_ACCOUNT_ID,
    rfqs: rfqs.length,
    rfq_requests: rfqRequests.length,
    sent_requests: rfqRequests.filter((r) => r.status === 'sent').length,
    rfq_ids: rfqs.map((r) => r.id),
  };
}
