// Domain constants
export const RFQ_DOMAINS = [
  'raw_material',
  'coating',
  'passivation',
  'quenching',
  'subcontractor',
] as const;

export type RfqDomain = typeof RFQ_DOMAINS[number];

export const DOMAIN_LABELS_HE: Record<RfqDomain, string> = {
  raw_material: 'חומר גלם',
  coating: 'ציפוי',
  passivation: 'פסיבציה',
  quenching: 'חישול',
  subcontractor: 'קבלן משנה',
};

// Table types
export type Account = {
  id: string;
  name: string;
  sender_email: string;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  account_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
};

export type Client = {
  id: string;
  account_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  account_id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  domain: RfqDomain;
  created_at: string;
  updated_at: string;
};

export type ClientSupplierApproval = {
  id: string;
  client_id: string;
  supplier_id: string;
  created_at: string;
};

export type Part = {
  id: string;
  account_id: string;
  client_id: string;
  serial_number: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type PartRevision = {
  id: string;
  part_id: string;
  revision_number: number;
  created_at: string;
};

export type RfqStatus = 'draft' | 'in_progress' | 'completed';

export type Rfq = {
  id: string;
  account_id: string;
  part_revision_id: string;
  base_quantity: number;
  drawing_url: string | null;
  drawing_filename: string | null;
  notes: string | null;
  status: RfqStatus;
  created_at: string;
  updated_at: string;
};

export type RfqDomainConfig = {
  id: string;
  rfq_id: string;
  domain: RfqDomain;
  quantity_override: number | null;
  email_subject: string | null;
  email_body_text: string | null;
  created_at: string;
  updated_at: string;
};

export type RfqRequestStatus = 'pending' | 'sent';

export type RfqRequest = {
  id: string;
  rfq_id: string;
  supplier_id: string;
  domain: RfqDomain;
  status: RfqRequestStatus;
  sent_at: string | null;
  is_approved_supplier: boolean;
  created_at: string;
};

// Helper functions
export const formatRevision = (rev: number): string =>
  rev.toString().padStart(2, '0');

export const defaultSubject = (
  partSn: string,
  revision: number,
  domain: RfqDomain
): string =>
  `בקשה להצעת מחיר | מק"ט: ${partSn} | רוויזיה: ${formatRevision(revision)} | ${DOMAIN_LABELS_HE[domain]}`;

export const getQuantity = (
  baseQuantity: number,
  domainConfig?: { quantity_override: number | null }
): number => domainConfig?.quantity_override ?? baseQuantity;
