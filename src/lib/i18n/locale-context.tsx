'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Locale, Dictionary } from './index';
import { he } from './he';
import { en } from './en';

const dictionaries: Record<Locale, Dictionary> = { he, en };

type LocaleContextValue = {
  locale: Locale;
  dictionary: Dictionary;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'he',
  dictionary: he,
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const dictionary = dictionaries[locale];
  return (
    <LocaleContext.Provider value={{ locale, dictionary }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useDictionary(): Dictionary {
  return useContext(LocaleContext).dictionary;
}

export const useT = useDictionary;
