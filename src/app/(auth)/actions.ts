'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/actions';

export async function createAccountAndUser(
  authUserId: string,
  companyName: string,
  fullName: string,
  email: string
): Promise<ActionResult> {
  try {
    // Use admin client — the user has no session yet (email not confirmed)
    const supabase = createAdminClient();

    // Create account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({ name: companyName, sender_email: email })
      .select('id')
      .single();

    if (accountError) {
      return { success: false, error: 'שגיאה ביצירת חשבון' };
    }

    // Create user with explicit id matching auth user
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        account_id: account.id,
        full_name: fullName,
        email,
      });

    if (userError) {
      return { success: false, error: 'שגיאה ביצירת משתמש' };
    }

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: 'שגיאה לא צפויה, נסה שוב' };
  }
}
