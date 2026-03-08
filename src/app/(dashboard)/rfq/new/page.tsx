import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import { NewRfqForm } from './new-rfq-form';

export const metadata: Metadata = {
  title: 'בקשה חדשה',
};

export default async function NewRfqPage() {
  const accountId = await getAccountId();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('account_id', accountId)
    .order('name');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">בקשה חדשה</h1>
      <NewRfqForm clients={clients ?? []} />
    </div>
  );
}
