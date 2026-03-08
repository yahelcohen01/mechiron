'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAccountId } from '@/lib/supabase/account';
import { resend } from '@/lib/resend';
import type { Account, User, PendingInvite } from '@/lib/types';
import type { ActionResult } from '@/lib/types/actions';

export type OrganizationData = {
  account: Account;
  members: User[];
  pendingInvites: PendingInvite[];
};

export async function getOrganizationData(): Promise<ActionResult<OrganizationData>> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const [accountRes, membersRes, invitesRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', accountId).single(),
      supabase.from('users').select('*').eq('account_id', accountId).order('created_at'),
      supabase
        .from('pending_invites')
        .select('*')
        .eq('account_id', accountId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (accountRes.error) return { success: false, error: accountRes.error.message };
    if (membersRes.error) return { success: false, error: membersRes.error.message };
    if (invitesRes.error) return { success: false, error: invitesRes.error.message };

    return {
      success: true,
      data: {
        account: accountRes.data as Account,
        members: membersRes.data as User[],
        pendingInvites: invitesRes.data as PendingInvite[],
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateOrganization(formData: FormData): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const name = (formData.get('name') as string)?.trim();
    const senderEmail = (formData.get('sender_email') as string)?.trim();

    if (!name) return { success: false, error: 'שם חברה הוא שדה חובה' };
    if (!senderEmail) return { success: false, error: 'אימייל שולח הוא שדה חובה' };

    const { error } = await supabase
      .from('accounts')
      .update({ name, sender_email: senderEmail })
      .eq('id', accountId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/organization');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function inviteMember(formData: FormData): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const email = (formData.get('email') as string)?.trim().toLowerCase();
    if (!email) return { success: false, error: 'אימייל הוא שדה חובה' };

    // Check if already a member
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('account_id', accountId)
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return { success: false, error: 'משתמש עם אימייל זה כבר חבר בארגון' };
    }

    // Get current user ID for invited_by
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { success: false, error: 'לא מחובר' };

    // Get account name for the email
    const { data: account } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .single();

    // Upsert invite (handles re-inviting after previous cancellation)
    const { data: invite, error } = await supabase
      .from('pending_invites')
      .upsert(
        {
          account_id: accountId,
          email,
          invited_by: authUser.id,
          token: crypto.randomUUID(),
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'account_id,email' }
      )
      .select('token')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'הזמנה לאימייל זה כבר קיימת' };
      }
      return { success: false, error: error.message };
    }

    // Send invite email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${invite.token}`;

    await resend.emails.send({
      from: `${account?.name || 'מחירון'} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: email,
      subject: `הוזמנת להצטרף ל${account?.name || 'ארגון'} במחירון`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>הוזמנת להצטרף ל${account?.name || 'ארגון'}!</h2>
          <p>קיבלת הזמנה להצטרף לצוות <strong>${account?.name}</strong> במערכת מחירון.</p>
          <p>
            <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              הצטרף לצוות
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">הקישור תקף ל-7 ימים.</p>
        </div>
      `,
    });

    revalidatePath('/settings/organization');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function cancelInvite(inviteId: string): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('pending_invites')
      .delete()
      .eq('id', inviteId)
      .eq('account_id', accountId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/settings/organization');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function resendInvite(inviteId: string): Promise<ActionResult> {
  try {
    const accountId = await getAccountId();
    const supabase = await createClient();

    // Generate new token and reset expiry
    const newToken = crypto.randomUUID();
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error } = await supabase
      .from('pending_invites')
      .update({ token: newToken, expires_at: newExpiry })
      .eq('id', inviteId)
      .eq('account_id', accountId)
      .select('email')
      .single();

    if (error) return { success: false, error: error.message };

    // Get account name
    const { data: account } = await supabase
      .from('accounts')
      .select('name')
      .eq('id', accountId)
      .single();

    // Re-send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${newToken}`;

    await resend.emails.send({
      from: `${account?.name || 'מחירון'} <noreply@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
      to: invite.email,
      subject: `הוזמנת להצטרף ל${account?.name || 'ארגון'} במחירון`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>הוזמנת להצטרף ל${account?.name || 'ארגון'}!</h2>
          <p>קיבלת הזמנה להצטרף לצוות <strong>${account?.name}</strong> במערכת מחירון.</p>
          <p>
            <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              הצטרף לצוות
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">הקישור תקף ל-7 ימים.</p>
        </div>
      `,
    });

    revalidatePath('/settings/organization');
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
