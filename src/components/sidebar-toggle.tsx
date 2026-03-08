'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoutButton } from './logout-button';
import { ThemeToggle } from './theme-toggle';

export function SidebarToggle() {
  const [open, setOpen] = useState(false);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  function close() {
    setOpen(false);
  }

  return (
    <>
      {/* Sticky mobile header */}
      <div className="sticky top-0 z-40 md:hidden flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">מחירון</h1>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="תפריט"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Overlay + slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={close} />
          <aside className="fixed inset-y-0 end-0 w-64 bg-white dark:bg-gray-900 border-s border-gray-200 dark:border-gray-700 flex flex-col p-6 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">מחירון</h1>
              <button
                type="button"
                onClick={close}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="סגור"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2 flex-1">
              <Link href="/" onClick={close} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                בקשות הצעת מחיר
              </Link>
              <Link href="/rfq/new" onClick={close} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                בקשה חדשה
              </Link>
              <Link href="/settings/clients" onClick={close} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                ניהול לקוחות
              </Link>
              <Link href="/settings/suppliers" onClick={close} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                ניהול ספקים
              </Link>
              <Link href="/settings/organization" onClick={close} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md px-3 py-2 text-sm font-medium transition-colors">
                הגדרות ארגון
              </Link>
            </nav>
            <ThemeToggle />
            <LogoutButton />
          </aside>
        </div>
      )}
    </>
  );
}
