'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import { resend } from '@/lib/resend';
import {
  RFQ_DOMAINS,
  DOMAIN_LABELS_HE,
  SPEC_LABELS_HE,
  defaultSubject,
  formatRevision,
  getQuantity,
  type RfqDomain,
  type RfqStatus,
  type Supplier,
  type RfqRequestStatus,
} from '@/lib/types';
import type { ActionResult } from '@/lib/types/actions';

// --- Composite types ---

export type RfqDetail = {
  id: string;
  status: RfqStatus;
  base_quantity: number;
  drawing_url: string | null;
  drawing_filename: string | null;
  drawing_signed_url: string | null;
  notes: string | null;
  created_at: string;
  client_name: string;
  client_id: string;
  serial_number: string;
  revision_number: number;
};

export type DomainSupplierItem = {
  supplier: Supplier;
  rfq_request_id: string | null;
  rfq_request_status: RfqRequestStatus | null;
  is_approved: boolean;
};

export type DomainSectionData = {
  domain: RfqDomain;
  config: {
    quantity_override: number | null;
    email_subject: string;
    email_body_text: string;
    spec_value: string | null;
  };
  approved_suppliers: DomainSupplierItem[];
  available_non_approved: Supplier[];
};

export type RfqPageData = {
  rfq: RfqDetail;
  domains: DomainSectionData[];
  account_name: string;
};

// --- Main data fetch ---

export async function getRfqPageData(rfqId: string): Promise<ActionResult<RfqPageData>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Parallel queries
    const [rfqResult, configsResult, requestsResult, accountResult, allSuppliersResult] =
      await Promise.all([
        // 1. RFQ with joins
        supabase
          .from('rfqs')
          .select(`
            id, status, base_quantity, drawing_url, drawing_filename, notes, created_at,
            part_revision:part_revisions!inner(
              revision_number,
              part:parts!inner(
                serial_number,
                client_id,
                client:clients!inner(name)
              )
            )
          `)
          .eq('id', rfqId)
          .eq('account_id', accountId)
          .single(),

        // 2. Domain configs
        supabase
          .from('rfq_domain_configs')
          .select('*')
          .eq('rfq_id', rfqId),

        // 3. RFQ requests with supplier data
        supabase
          .from('rfq_requests')
          .select('id, supplier_id, domain, status, is_approved_supplier, supplier:suppliers(*)')
          .eq('rfq_id', rfqId),

        // 4. Account info
        supabase
          .from('accounts')
          .select('name, sender_email')
          .eq('id', accountId)
          .single(),

        // 5. All suppliers for this account
        supabase
          .from('suppliers')
          .select('*')
          .eq('account_id', accountId)
          .order('name'),
      ]);

    if (rfqResult.error) return { success: false, error: rfqResult.error.message };
    if (!rfqResult.data) return { success: false, error: 'בקשה לא נמצאה' };
    if (accountResult.error) return { success: false, error: accountResult.error.message };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rfqRow = rfqResult.data as any;
    const revision = rfqRow.part_revision;
    const part = revision.part;
    const client = part.client;

    // Get signed drawing URL
    let drawingSignedUrl: string | null = null;
    if (rfqRow.drawing_url) {
      const { data: signedData } = await supabase.storage
        .from('drawings')
        .createSignedUrl(rfqRow.drawing_url, 3600); // 1 hour
      drawingSignedUrl = signedData?.signedUrl ?? null;
    }

    const rfqDetail: RfqDetail = {
      id: rfqRow.id,
      status: rfqRow.status,
      base_quantity: rfqRow.base_quantity,
      drawing_url: rfqRow.drawing_url,
      drawing_filename: rfqRow.drawing_filename,
      drawing_signed_url: drawingSignedUrl,
      notes: rfqRow.notes,
      created_at: rfqRow.created_at,
      client_name: client.name,
      client_id: part.client_id,
      serial_number: part.serial_number,
      revision_number: revision.revision_number,
    };

    // Get client approvals
    const { data: approvalsData } = await supabase
      .from('client_supplier_approvals')
      .select('supplier_id')
      .eq('client_id', rfqDetail.client_id);

    const approvedSupplierIds = new Set((approvalsData ?? []).map((a) => a.supplier_id));

    const configs = configsResult.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requests = (requestsResult.data ?? []) as any[];
    const allSuppliers = (allSuppliersResult.data ?? []) as Supplier[];

    // Build domain sections
    const domains: DomainSectionData[] = RFQ_DOMAINS.map((domain) => {
      const config = configs.find((c) => c.domain === domain);
      const domainRequests = requests.filter((r) => r.domain === domain);
      const domainSuppliers = allSuppliers.filter((s) => s.domain === domain);

      // Suppliers already added to this RFQ for this domain
      const addedSupplierIds = new Set(domainRequests.map((r: { supplier_id: string }) => r.supplier_id));

      // Approved suppliers for this domain (with their RFQ request status if they've been added)
      const approvedInDomain = domainSuppliers
        .filter((s) => approvedSupplierIds.has(s.id))
        .map((s): DomainSupplierItem => {
          const req = domainRequests.find((r: { supplier_id: string }) => r.supplier_id === s.id);
          return {
            supplier: s,
            rfq_request_id: req?.id ?? null,
            rfq_request_status: req?.status ?? null,
            is_approved: true,
          };
        });

      // Non-approved suppliers added to this RFQ (one-time additions)
      const nonApprovedAdded = domainRequests
        .filter((r: { supplier_id: string }) => !approvedSupplierIds.has(r.supplier_id))
        .map((r: { id: string; status: RfqRequestStatus; supplier: Supplier }): DomainSupplierItem => ({
          supplier: r.supplier,
          rfq_request_id: r.id,
          rfq_request_status: r.status,
          is_approved: false,
        }));

      // Available non-approved suppliers (not yet added to this RFQ)
      const availableNonApproved = domainSuppliers.filter(
        (s) => !approvedSupplierIds.has(s.id) && !addedSupplierIds.has(s.id)
      );

      const defaultEmailBody = `מצורף שרטוט לבקשת הצעת מחיר.

נא להציע מחיר עבור {כמות} יחידות.
{תחום}: {ערך}

נודה לקבלת הצעתכם בהקדם.
בברכה`;

      return {
        domain,
        config: {
          quantity_override: config?.quantity_override ?? null,
          email_subject: config?.email_subject ?? defaultSubject(rfqDetail.serial_number, rfqDetail.revision_number, domain),
          email_body_text: config?.email_body_text ?? defaultEmailBody,
          spec_value: config?.spec_value ?? null,
        },
        approved_suppliers: [...approvedInDomain, ...nonApprovedAdded],
        available_non_approved: availableNonApproved,
      };
    });

    return {
      success: true,
      data: {
        rfq: rfqDetail,
        domains,
        account_name: accountResult.data.name,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Domain config ---

export async function saveDomainConfig(
  rfqId: string,
  domain: RfqDomain,
  data: { quantity_override: number | null; email_subject: string; email_body_text: string; spec_value: string | null }
): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Verify ownership
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('id')
      .eq('id', rfqId)
      .eq('account_id', accountId)
      .single();

    if (rfqError || !rfq) return { success: false, error: 'בקשה לא נמצאה' };

    const { error } = await supabase
      .from('rfq_domain_configs')
      .upsert(
        {
          rfq_id: rfqId,
          domain,
          quantity_override: data.quantity_override,
          email_subject: data.email_subject,
          email_body_text: data.email_body_text,
          spec_value: data.spec_value,
        },
        { onConflict: 'rfq_id,domain' }
      );

    if (error) return { success: false, error: error.message };

    revalidatePath(`/rfq/${rfqId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Spec value suggestions ---

export async function getSpecSuggestions(
  domain: RfqDomain,
  query: string
): Promise<ActionResult<string[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('rfq_domain_configs')
      .select('spec_value, rfqs!inner(account_id)')
      .eq('domain', domain)
      .eq('rfqs.account_id', accountId)
      .not('spec_value', 'is', null)
      .ilike('spec_value', `%${query}%`);

    if (error) return { success: false, error: error.message };

    // Deduplicate and count frequency
    const freq = new Map<string, number>();
    for (const row of data ?? []) {
      if (row.spec_value) {
        freq.set(row.spec_value, (freq.get(row.spec_value) ?? 0) + 1);
      }
    }

    const suggestions = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value]) => value);

    return { success: true, data: suggestions };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Supplier management ---

export async function addSupplierToRfq(
  rfqId: string,
  supplierId: string,
  domain: RfqDomain,
  isApprovedSupplier: boolean
): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Verify ownership
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('id')
      .eq('id', rfqId)
      .eq('account_id', accountId)
      .single();

    if (rfqError || !rfq) return { success: false, error: 'בקשה לא נמצאה' };

    const { error } = await supabase
      .from('rfq_requests')
      .insert({
        rfq_id: rfqId,
        supplier_id: supplierId,
        domain,
        status: 'pending',
        is_approved_supplier: isApprovedSupplier,
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ספק זה כבר נוסף לבקשה זו' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath(`/rfq/${rfqId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeSupplierFromRfq(requestId: string, rfqId: string): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Verify ownership via RFQ
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('id')
      .eq('id', rfqId)
      .eq('account_id', accountId)
      .single();

    if (rfqError || !rfq) return { success: false, error: 'בקשה לא נמצאה' };

    // Only delete if status is pending
    const { error } = await supabase
      .from('rfq_requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) return { success: false, error: error.message };

    revalidatePath(`/rfq/${rfqId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createInlineSupplier(
  formData: FormData,
  rfqId: string,
  domain: RfqDomain,
  isApprovedSupplier: boolean
): Promise<ActionResult<Supplier>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const contactName = (formData.get('contact_name') as string) || null;
    const phone = (formData.get('phone') as string) || null;

    if (!name?.trim()) return { success: false, error: 'שם ספק הוא שדה חובה' };
    if (!email?.trim()) return { success: false, error: 'אימייל הוא שדה חובה' };

    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .insert({
        account_id: accountId,
        name: name.trim(),
        email: email.trim(),
        contact_name: contactName,
        phone,
        domain,
      })
      .select()
      .single();

    if (supplierError) {
      if (supplierError.code === '23505') {
        return { success: false, error: 'ספק עם שם זהה כבר קיים בתחום זה' };
      }
      return { success: false, error: supplierError.message };
    }

    // Also add to this RFQ
    await supabase
      .from('rfq_requests')
      .insert({
        rfq_id: rfqId,
        supplier_id: supplier.id,
        domain,
        status: 'pending',
        is_approved_supplier: isApprovedSupplier,
      });

    revalidatePath(`/rfq/${rfqId}`);
    return { success: true, data: supplier as Supplier };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Email sending ---

export async function sendDomainEmails(
  rfqId: string,
  domain: RfqDomain
): Promise<ActionResult<{ sent: number; failed: string[] }>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Fetch RFQ with part info
    const { data: rfqRow, error: rfqError } = await supabase
      .from('rfqs')
      .select(`
        id, status, base_quantity, drawing_url, drawing_filename,
        part_revision:part_revisions!inner(
          revision_number,
          part:parts!inner(serial_number)
        )
      `)
      .eq('id', rfqId)
      .eq('account_id', accountId)
      .single();

    if (rfqError || !rfqRow) return { success: false, error: 'בקשה לא נמצאה' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rfq = rfqRow as any;
    const partSn = rfq.part_revision.part.serial_number;
    const revisionNumber = rfq.part_revision.revision_number;

    // Fetch account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('name, sender_email')
      .eq('id', accountId)
      .single();

    if (accountError || !account) return { success: false, error: 'חשבון לא נמצא' };

    // Fetch domain config
    const { data: config } = await supabase
      .from('rfq_domain_configs')
      .select('*')
      .eq('rfq_id', rfqId)
      .eq('domain', domain)
      .maybeSingle();

    const emailSubject = config?.email_subject ?? defaultSubject(partSn, revisionNumber, domain);
    const rawEmailBodyText = config?.email_body_text ?? '';
    const specValue = config?.spec_value ?? '';
    const quantity = getQuantity(rfq.base_quantity, config);

    // Replace template placeholders
    const emailBodyText = rawEmailBodyText
      .replace(/\{כמות\}/g, String(quantity))
      .replace(/\{תחום\}/g, DOMAIN_LABELS_HE[domain])
      .replace(/\{ערך\}/g, specValue)
      .replace(/\{מקט\}/g, partSn)
      .replace(/\{רוויזיה\}/g, formatRevision(revisionNumber));

    // Fetch pending requests for this domain
    const { data: pendingRequests, error: reqError } = await supabase
      .from('rfq_requests')
      .select('id, supplier:suppliers(name, email)')
      .eq('rfq_id', rfqId)
      .eq('domain', domain)
      .eq('status', 'pending');

    if (reqError) return { success: false, error: reqError.message };
    if (!pendingRequests || pendingRequests.length === 0) {
      return { success: false, error: 'אין ספקים ממתינים לשליחה בתחום זה' };
    }

    // Download drawing if exists
    let attachments: { filename: string; content: Buffer }[] = [];
    if (rfq.drawing_url && rfq.drawing_filename) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('drawings')
        .download(rfq.drawing_url);

      if (!downloadError && fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        attachments = [{ filename: rfq.drawing_filename, content: buffer }];
      }
    }

    // Build HTML template
    const buildEmailHtml = () => `
      <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>בקשה להצעת מחיר</h2>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 4px 12px; font-weight: bold;">מק"ט:</td>
            <td style="padding: 4px 12px;">${partSn}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; font-weight: bold;">רוויזיה:</td>
            <td style="padding: 4px 12px;">${formatRevision(revisionNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; font-weight: bold;">כמות:</td>
            <td style="padding: 4px 12px;">${quantity}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; font-weight: bold;">תחום:</td>
            <td style="padding: 4px 12px;">${DOMAIN_LABELS_HE[domain]}</td>
          </tr>
          ${specValue ? `<tr>
            <td style="padding: 4px 12px; font-weight: bold;">${SPEC_LABELS_HE[domain]}:</td>
            <td style="padding: 4px 12px;">${specValue}</td>
          </tr>` : ''}
        </table>
        ${emailBodyText ? `<div style="margin: 16px 0; white-space: pre-wrap;">${emailBodyText}</div>` : ''}
        <p style="color: #666; font-size: 12px; margin-top: 24px;">נשלח ע"י ${account.name}</p>
      </div>
    `;

    const html = buildEmailHtml();

    // Determine sender
    const fromAddress = account.sender_email
      ? `"${account.name}" <${account.sender_email}>`
      : `"${account.name}" <onboarding@resend.dev>`;

    // Send emails
    let sentCount = 0;
    const failed: string[] = [];

    for (const request of pendingRequests) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supplier = request.supplier as any;

      try {
        await resend.emails.send({
          from: fromAddress,
          to: supplier.email,
          subject: emailSubject,
          html,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
          })),
        });

        // Mark as sent
        await supabase
          .from('rfq_requests')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', request.id);

        sentCount++;
      } catch {
        failed.push(supplier.name);
      }
    }

    // Update RFQ status from draft to in_progress if needed
    if (sentCount > 0 && rfq.status === 'draft') {
      await supabase
        .from('rfqs')
        .update({ status: 'in_progress' })
        .eq('id', rfqId);
    }

    revalidatePath(`/rfq/${rfqId}`);
    return { success: true, data: { sent: sentCount, failed } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// --- Status update ---

export async function updateRfqStatus(rfqId: string, status: RfqStatus): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('rfqs')
      .update({ status })
      .eq('id', rfqId)
      .eq('account_id', accountId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/rfq/${rfqId}`);
    revalidatePath('/');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
