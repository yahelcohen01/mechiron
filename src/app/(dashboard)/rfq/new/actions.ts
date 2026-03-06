'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import type { ActionResult } from '@/lib/types/actions';

type ClientOption = { id: string; name: string };
type PartOption = { id: string; serial_number: string; description: string | null };

export async function getClients(): Promise<ActionResult<ClientOption[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('account_id', accountId)
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ClientOption[] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getPartsForClient(clientId: string): Promise<ActionResult<PartOption[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('parts')
      .select('id, serial_number, description')
      .eq('account_id', accountId)
      .eq('client_id', clientId)
      .order('serial_number');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as PartOption[] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getNextRevision(partId: string): Promise<ActionResult<number>> {
  try {
    const supabase = await createSupabaseClient();

    const { data, error } = await supabase
      .from('part_revisions')
      .select('revision_number')
      .eq('part_id', partId)
      .order('revision_number', { ascending: false })
      .limit(1);

    if (error) return { success: false, error: error.message };

    const nextRevision = data && data.length > 0 ? data[0].revision_number + 1 : 0;
    return { success: true, data: nextRevision };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createInlineClient(
  formData: FormData
): Promise<ActionResult<ClientOption>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const name = formData.get('name') as string;
    if (!name?.trim()) {
      return { success: false, error: 'שם לקוח הוא שדה חובה' };
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ account_id: accountId, name: name.trim() })
      .select('id, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'לקוח עם שם זהה כבר קיים' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/rfq/new');
    return { success: true, data: data as ClientOption };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createRfq(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createSupabaseClient();

    const clientId = formData.get('client_id') as string;
    const isNewPart = formData.get('is_new_part') === 'true';
    const existingPartId = formData.get('part_id') as string | null;
    const serialNumber = formData.get('serial_number') as string;
    const description = (formData.get('description') as string) || null;
    const baseQuantity = parseInt(formData.get('base_quantity') as string, 10);
    const notes = (formData.get('notes') as string) || null;
    const drawingFile = formData.get('drawing') as File | null;

    if (!clientId) return { success: false, error: 'יש לבחור לקוח' };
    if (!serialNumber?.trim() && isNewPart) return { success: false, error: 'מק"ט הוא שדה חובה' };
    if (!baseQuantity || baseQuantity < 1) return { success: false, error: 'כמות חייבת להיות לפחות 1' };

    // Resolve part ID
    let partId: string;

    if (isNewPart) {
      const { data: newPart, error: partError } = await supabase
        .from('parts')
        .insert({
          account_id: accountId,
          client_id: clientId,
          serial_number: serialNumber.trim(),
          description,
        })
        .select('id')
        .single();

      if (partError) {
        if (partError.code === '23505') {
          return { success: false, error: 'מק"ט זה כבר קיים עבור לקוח זה' };
        }
        return { success: false, error: partError.message };
      }
      partId = newPart.id;
    } else {
      if (!existingPartId) return { success: false, error: 'יש לבחור חלק' };
      partId = existingPartId;
    }

    // Calculate next revision
    const { data: revisions, error: revError } = await supabase
      .from('part_revisions')
      .select('revision_number')
      .eq('part_id', partId)
      .order('revision_number', { ascending: false })
      .limit(1);

    if (revError) return { success: false, error: revError.message };
    const revisionNumber = revisions && revisions.length > 0 ? revisions[0].revision_number + 1 : 0;

    // Create part revision
    const { data: revision, error: revInsertError } = await supabase
      .from('part_revisions')
      .insert({ part_id: partId, revision_number: revisionNumber })
      .select('id')
      .single();

    if (revInsertError) return { success: false, error: revInsertError.message };

    // Create RFQ
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .insert({
        account_id: accountId,
        part_revision_id: revision.id,
        base_quantity: baseQuantity,
        notes,
        status: 'draft',
      })
      .select('id')
      .single();

    if (rfqError) return { success: false, error: rfqError.message };

    // Upload drawing if provided
    if (drawingFile && drawingFile.size > 0) {
      const storagePath = `${accountId}/${rfq.id}/${drawingFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(storagePath, drawingFile);

      if (uploadError) {
        // RFQ created but drawing upload failed — update notes
        await supabase
          .from('rfqs')
          .update({ notes: `${notes ?? ''}\n[שגיאה בהעלאת שרטוט: ${uploadError.message}]`.trim() })
          .eq('id', rfq.id);
      } else {
        await supabase
          .from('rfqs')
          .update({ drawing_url: storagePath, drawing_filename: drawingFile.name })
          .eq('id', rfq.id);
      }
    }

    revalidatePath('/');
    return { success: true, data: { id: rfq.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
