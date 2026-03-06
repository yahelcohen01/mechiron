import { createClient } from './server';

export async function getAccountId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    throw new Error('Account not found');
  }

  return data.account_id;
}

export async function getAccountName(): Promise<string> {
  const supabase = await createClient();
  const accountId = await getAccountId();

  const { data, error } = await supabase
    .from('accounts')
    .select('name')
    .eq('id', accountId)
    .single();

  if (error || !data) {
    throw new Error('Account not found');
  }

  return data.name;
}
