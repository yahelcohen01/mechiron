'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import type { Client, Supplier } from '@/lib/types';
import type { ActionResult } from '@/lib/types/actions';

export async function getClients(): Promise<ActionResult<Client[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('account_id', accountId)
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Client[] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createClient(formData: FormData): Promise<ActionResult<Client>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('clients')
      .insert({
        account_id: accountId,
        name: formData.get('name') as string,
        contact_name: (formData.get('contact_name') as string) || null,
        contact_email: (formData.get('contact_email') as string) || null,
        contact_phone: (formData.get('contact_phone') as string) || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'לקוח עם שם זהה כבר קיים' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/clients');
    return { success: true, data: data as Client };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateClient(id: string, formData: FormData): Promise<ActionResult<Client>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('clients')
      .update({
        name: formData.get('name') as string,
        contact_name: (formData.get('contact_name') as string) || null,
        contact_email: (formData.get('contact_email') as string) || null,
        contact_phone: (formData.get('contact_phone') as string) || null,
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'לקוח עם שם זהה כבר קיים' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/clients');
    return { success: true, data: data as Client };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'לא ניתן למחוק לקוח שמשויך לחלקים או בקשות' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/clients');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type ApprovedSupplier = Supplier & { approval_id: string };

export async function getClientApprovals(clientId: string): Promise<ActionResult<ApprovedSupplier[]>> {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('client_supplier_approvals')
      .select('id, supplier:suppliers(*)')
      .eq('client_id', clientId);

    if (error) return { success: false, error: error.message };

    const approvals = (data ?? []).map((row) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(row.supplier as any),
      approval_id: row.id,
    })) as ApprovedSupplier[];

    return { success: true, data: approvals };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getAvailableSuppliers(
  clientId: string,
  domain?: string
): Promise<ActionResult<Supplier[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    // Get already-approved supplier IDs
    const { data: approvals } = await supabase
      .from('client_supplier_approvals')
      .select('supplier_id')
      .eq('client_id', clientId);

    const approvedIds = (approvals ?? []).map((a) => a.supplier_id);

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('account_id', accountId)
      .order('name');

    if (approvedIds.length > 0) {
      query = query.not('id', 'in', `(${approvedIds.join(',')})`);
    }

    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Supplier[] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function addApproval(clientId: string, supplierId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('client_supplier_approvals')
      .insert({ client_id: clientId, supplier_id: supplierId });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ספק זה כבר מאושר עבור לקוח זה' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/clients');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeApproval(clientId: string, supplierId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('client_supplier_approvals')
      .delete()
      .eq('client_id', clientId)
      .eq('supplier_id', supplierId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/clients');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
