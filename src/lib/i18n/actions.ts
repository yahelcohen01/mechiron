'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { type Locale, LOCALES } from './index';

export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
