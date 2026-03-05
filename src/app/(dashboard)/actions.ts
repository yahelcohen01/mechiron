'use server';

import { createClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import type { RfqListItem, RfqStatus } from '@/lib/types';
import type { ActionResult } from '@/lib/types/actions';

type RfqFilters = {
  clientId?: string;
  status?: RfqStatus;
};

export async function getRfqs(filters?: RfqFilters): Promise<ActionResult<RfqListItem[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    let query = supabase
      .from('rfqs')
      .select(`
        id,
        status,
        base_quantity,
        created_at,
        part_revision:part_revisions!inner(
          revision_number,
          part:parts!inner(
            serial_number,
            client:clients!inner(
              name
            )
          )
        ),
        rfq_requests(
          id,
          status
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: RfqListItem[] = (data ?? []).map((row: any) => {
      const revision = row.part_revision;
      const part = revision.part;
      const client = part.client;
      const requests = row.rfq_requests ?? [];

      return {
        id: row.id,
        status: row.status,
        base_quantity: row.base_quantity,
        created_at: row.created_at,
        client_name: client.name,
        serial_number: part.serial_number,
        revision_number: revision.revision_number,
        total_requests: requests.length,
        sent_requests: requests.filter((r: { status: string }) => r.status === 'sent').length,
      };
    });

    // Client filter (post-query since it's a nested join)
    if (filters?.clientId) {
      // We need to filter by client_id through the join chain
      // Re-query with the client filter
      const { data: filteredData, error: filteredError } = await supabase
        .from('rfqs')
        .select(`
          id,
          status,
          base_quantity,
          created_at,
          part_revision:part_revisions!inner(
            revision_number,
            part:parts!inner(
              serial_number,
              client_id,
              client:clients!inner(
                name
              )
            )
          ),
          rfq_requests(
            id,
            status
          )
        `)
        .eq('account_id', accountId)
        .eq('part_revision.part.client_id', filters.clientId)
        .order('created_at', { ascending: false });

      if (filteredError) return { success: false, error: filteredError.message };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filteredItems: RfqListItem[] = (filteredData ?? []).map((row: any) => {
        const revision = row.part_revision;
        const part = revision.part;
        const client = part.client;
        const requests = row.rfq_requests ?? [];

        return {
          id: row.id,
          status: row.status,
          base_quantity: row.base_quantity,
          created_at: row.created_at,
          client_name: client.name,
          serial_number: part.serial_number,
          revision_number: revision.revision_number,
          total_requests: requests.length,
          sent_requests: requests.filter((r: { status: string }) => r.status === 'sent').length,
        };
      });

      return { success: true, data: filteredItems };
    }

    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function getClientsForFilter(): Promise<ActionResult<{ id: string; name: string }[]>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('account_id', accountId)
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data: data ?? [] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
