import { cache } from 'react';
import { createClient } from './server';

// Wrapped in React.cache so the auth + users lookup is deduped across the many
// call sites that run within a single request (dashboard alone calls this 3x).
export const getAccountId = cache(async (): Promise<string> => {
  const supabase = await createClient();

  // getClaims verifies the JWT locally (no network) once the project uses
  // asymmetric signing keys, falling back to a getUser() network call on the
  // legacy HS256 secret. Either way the token is fully validated.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('users')
    .select('account_id')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error('Account not found');
  }

  return data.account_id;
});

export const getAccountName = cache(async (): Promise<string> => {
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
});
