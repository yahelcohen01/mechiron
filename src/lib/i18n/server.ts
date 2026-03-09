import { cookies } from 'next/headers';
import { type Locale, DEFAULT_LOCALE, LOCALES, getDir } from './index';
import type { Dictionary } from './index';
import { he } from './he';
import { en } from './en';

const dictionaries: Record<Locale, Dictionary> = { he, en };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value;
  if (raw && LOCALES.includes(raw as Locale)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return dictionaries[locale];
}

export async function getLocaleAndDir() {
  const locale = await getLocale();
  return { locale, dir: getDir(locale) };
}
