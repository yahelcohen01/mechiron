'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useLocale, useT } from '@/lib/i18n/locale-context';
import { setLocale } from '@/lib/i18n/actions';
import type { Locale } from '@/lib/i18n/index';

export function SystemSettings() {
  const t = useT();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLocaleChange = async (newLocale: Locale) => {
    if (newLocale === locale) return;
    await setLocale(newLocale);
  };

  const localeOptions: { value: Locale; label: string }[] = [
    { value: 'he', label: t.systemSettings.hebrew },
    { value: 'en', label: t.systemSettings.english },
  ];

  const themeOptions = [
    { value: 'light', label: t.systemSettings.light },
    { value: 'dark', label: t.systemSettings.dark },
    { value: 'system', label: t.systemSettings.system },
  ];

  return (
    <div className="space-y-8">
      {/* Language */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t.systemSettings.language}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t.systemSettings.languageDesc}
        </p>
        <div className="flex gap-3">
          {localeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLocaleChange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                locale === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {t.systemSettings.appearance}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t.systemSettings.appearanceDesc}
        </p>
        {mounted && (
          <div className="flex gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  theme === opt.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {!mounted && <div className="h-10" />}
      </div>
    </div>
  );
}
