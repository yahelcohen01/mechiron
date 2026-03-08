'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/actions';

export type InviteInfo = {
  email: string;
  accountName: string;
};

export async function validateInviteToken(token: string): Promise<ActionResult<InviteInfo>> {
  try {
    const supabase = createAdminClient();

    const { data: invite, error } = await supabase
      .from('pending_invites')
      .select('email, status, expires_at, accounts(name)')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (error || !invite) {
      return { success: false, error: 'קישור הזמנה לא תקין או שפג תוקפו' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('pending_invites')
        .update({ status: 'expired' })
        .eq('token', token);

      return { success: false, error: 'פג תוקף ההזמנה. בקש הזמנה חדשה מהמנהל.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accountName = (invite.accounts as any)?.name || '';

    return {
      success: true,
      data: { email: invite.email, accountName },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function acceptInvite(
  token: string,
  authUserId: string,
  fullName: string
): Promise<ActionResult> {
  try {
    const supabase = createAdminClient();

    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('pending_invites')
      .select('account_id, email, status, expires_at')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return { success: false, error: 'קישור הזמנה לא תקין' };
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'פג תוקף ההזמנה' };
    }

    // Create user record in the same account
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      account_id: invite.account_id,
      full_name: fullName,
      email: invite.email,
    });

    if (userError) {
      if (userError.code === '23505') {
        return { success: false, error: 'משתמש כבר קיים במערכת' };
      }
      return { success: false, error: 'שגיאה ביצירת משתמש' };
    }

    // Mark invite as accepted
    await supabase
      .from('pending_invites')
      .update({ status: 'accepted' })
      .eq('token', token);

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
