'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import type { Supplier, RfqDomain } from '@/lib/types';
import type { ActionResult } from '@/lib/types/actions';

export async function getSuppliers(domain?: RfqDomain): Promise<ActionResult<Supplier[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('account_id', accountId)
      .order('name');

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

export async function createSupplier(formData: FormData): Promise<ActionResult<Supplier>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        account_id: accountId,
        name: formData.get('name') as string,
        contact_name: (formData.get('contact_name') as string) || null,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || null,
        domain: formData.get('domain') as RfqDomain,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ספק עם שם זהה כבר קיים בתחום זה' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/suppliers');
    return { success: true, data: data as Supplier };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateSupplier(id: string, formData: FormData): Promise<ActionResult<Supplier>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('suppliers')
      .update({
        name: formData.get('name') as string,
        contact_name: (formData.get('contact_name') as string) || null,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || null,
        domain: formData.get('domain') as RfqDomain,
      })
      .eq('id', id)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ספק עם שם זהה כבר קיים בתחום זה' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/suppliers');
    return { success: true, data: data as Supplier };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      if (error.code === '23503') {
        return { success: false, error: 'לא ניתן למחוק ספק שמשויך לבקשות הצעת מחיר' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/settings/suppliers');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
